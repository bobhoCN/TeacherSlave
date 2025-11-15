// ===== 数学作业批改系统 - 代理服务器 =====

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3002;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// API配置
const MOONSHOT_API_KEY = 'sk-U9stsIdpW4JCP8knL5kbTRAh4RBvLNfjFQMjMnrirguTIFGY';
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const MOONSHOT_MODEL = 'moonshot-v1-8k-vision-preview';

// 文件上传配置
const upload = multer({ storage: multer.memoryStorage() });

// 智能提取学生姓名
function extractStudentName(content) {
    if (!content) return '未知';

    const patterns = [
        // 模式1: "姓名：张三" 或 "学生：李四"
        /(?:姓名|学生|name|Name)[：:\s]*([^\n\r,，。、]+)/i,
        // 模式2: "我叫XXX" 或 "我是XXX"
        /(?:我叫|我是|我叫做的|我叫做)[：:\s]*([^\n\r,，。、]+)/i,
        // 模式3: 直接提取2-4个汉字（常见姓名）
        /^\s*([\u4e00-\u9fa5]{2,4})\s*$/m,
        // 模式4: 在文本中查找可能的姓名（前后有标点的）
        /(?:^|[\s,，。、])[\s]*([\u4e00-\u9fa5]{2,4})[\s]*(?:$|[\s,，。、])/,
        // 模式5: 查找"XXX同学"格式
        /([\u4e00-\u9fa5]{2,4})同学/,
        // 模式6: 查找顶部可能的姓名（通常在第一行前几个字符）
        /^([\u4e00-\u9fa5]{2,4})/m
    ];

    // 尝试每种模式
    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
            let name = match[1].trim();

            // 过滤掉明显的非姓名词汇
            const excludeWords = ['姓名', '学生', '名字', 'name', '班级', '学校', '年级', '姓名：', '学生：', '第', '题', '页', '日期'];
            if (!excludeWords.some(word => name.includes(word))) {
                // 确保是合理的姓名长度
                if (name.length >= 2 && name.length <= 4) {
                    console.log(`模式匹配成功: ${pattern} -> ${name}`);
                    return name;
                }
            }
        }
    }

    // 如果所有模式都失败，尝试提取第一个连续的中文词
    const chineseMatch = content.match(/[\u4e00-\u9fa5]{2,4}/);
    if (chineseMatch) {
        console.log('使用fallback提取:', chineseMatch[0]);
        return chineseMatch[0];
    }

    return '未知';
}

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器运行正常' });
});

// 识别学生姓名
app.post('/api/recognize/name', upload.single('image'), async (req, res) => {
    try {
        console.log('收到姓名识别请求...');

        if (!req.file) {
            return res.status(400).json({ error: '未接收到图片' });
        }

        const imageData = req.file.buffer;
        const base64Image = imageData.toString('base64');
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;

        const prompt = `请仔细识别图片中的学生姓名。请尝试以下多种方式识别：

1. 查找明确的姓名标注：如"姓名："、"学生："、"name："等
2. 识别作业顶部可能的姓名（通常在第一行或前几行）
3. 识别2-4个连续汉字的姓名组合
4. 识别可能的姓名格式：如"张三"、"李四"等常见姓名

请以以下格式返回：
姓名：张三

如果完全无法识别，请返回"姓名：未知"`;

        const response = await fetch(MOONSHOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MOONSHOT_API_KEY}`
            },
            body: JSON.stringify({
                model: MOONSHOT_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '你是Kimi，专业的数学作业批改助手。'
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: { url: imageUrl }
                            },
                            {
                                type: 'text',
                                text: prompt
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API调用失败: ${response.status} - ${error}`);
        }

        const result = await response.json();
        const content = result.choices[0].message.content;

        console.log('API原始响应:', content);

        // 多模式提取姓名
        let studentName = extractStudentName(content);

        console.log('提取的姓名:', studentName);

        res.json({ success: true, studentName });

    } catch (error) {
        console.error('姓名识别错误:', error);
        res.status(500).json({
            error: '识别失败',
            message: error.message
        });
    }
});

// 识别题目和答案
app.post('/api/recognize/questions', upload.single('image'), async (req, res) => {
    try {
        console.log('收到题目识别请求...');

        if (!req.file) {
            return res.status(400).json({ error: '未接收到图片' });
        }

        const imageData = req.file.buffer;
        const base64Image = imageData.toString('base64');
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;

        const prompt = `请仔细识别图片中的数学题目和答案。请严格按照以下JSON格式返回：

{
  "questions": [
    {
      "question": "题目内容（完整题目）",
      "studentAnswer": "学生在作业上写的答案（完全照抄）",
      "correctAnswer": "根据数学知识计算出的正确答案（只给结果，不写过程）",
      "fullScore": 10
    }
  ]
}

重要说明：
1. studentAnswer必须完全照抄学生在作业上写的答案，不要修改
2. correctAnswer必须是正确的数学答案，只给最终结果
3. 如果有多道题目，请全部识别并列出
4. 如果某道题看不清或无法识别，请将该项设为空字符串
5. fullScore默认每题10分，可根据题目难度调整

请只返回JSON，不要包含其他文字说明。`;

        const response = await fetch(MOONSHOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MOONSHOT_API_KEY}`
            },
            body: JSON.stringify({
                model: MOONSHOT_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '你是Kimi，专业的数学作业批改助手。'
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: { url: imageUrl }
                            },
                            {
                                type: 'text',
                                text: prompt
                            }
                        ]
                    }
                ],
                max_tokens: 2000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API调用失败: ${response.status} - ${error}`);
        }

        const result = await response.json();
        const content = result.choices[0].message.content;

        // 尝试解析 JSON
        let questions = [];
        try {
            // 尝试多种方式提取 JSON
            let jsonStr = null;

            // 方法 1: 查找完整的 JSON 块
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            // 方法 2: 如果没找到，尝试清理文本后重新匹配
            if (!jsonStr) {
                const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
                const cleanedMatch = cleaned.match(/\{[\s\S]*\}/);
                if (cleanedMatch) {
                    jsonStr = cleanedMatch[0];
                }
            }

            if (jsonStr) {
                // 修复 JSON 转义问题，特别是 LaTeX 公式中的反斜杠
                try {
                    const data = JSON.parse(jsonStr);
                    questions = data.questions || [];
                } catch (jsonError) {
                    // 如果解析失败，尝试修复常见的转义问题
                    console.warn('JSON 解析失败，尝试修复...', jsonError.message);
                    let fixedJson = jsonStr;

                    // 修复双反斜杠问题（但保留 LaTeX 公式中的反斜杠）
                    fixedJson = fixedJson.replace(/\\\\/g, '\\');

                    // 修复其他常见转义问题
                    fixedJson = fixedJson
                        .replace(/\\n/g, ' ')
                        .replace(/\\r/g, ' ')
                        .replace(/\\\"/g, '"')
                        .replace(/\\'/g, "'");

                    try {
                        const data = JSON.parse(fixedJson);
                        questions = data.questions || [];
                        console.log('✓ JSON 修复成功');
                    } catch (secondError) {
                        console.error('JSON 修复失败:', secondError.message);
                        questions = [];
                    }
                }
            } else {
                console.warn('未能从响应中提取 JSON');
            }
        } catch (parseError) {
            console.error('JSON 解析失败:', parseError.message);
            console.error('原始内容:', content.substring(0, 200));

            // 返回空数组而不是失败
            questions = [];
        }

        res.json({ success: true, questions });

    } catch (error) {
        console.error('题目识别错误:', error);
        res.status(500).json({
            error: '识别失败',
            message: error.message
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log('========================================');
    console.log('  数学作业批改系统 - 代理服务器');
    console.log('========================================');
    console.log(`✓ 服务器地址: http://localhost:${PORT}`);
    console.log(`✓ API地址: http://localhost:${PORT}/api`);
    console.log(`✓ 静态文件: http://localhost:${PORT}/index.html`);
    console.log('========================================');
    console.log('');
    console.log('服务器已启动，按 Ctrl+C 停止');
});
