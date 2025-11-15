// ===== 数学作业批改系统 - 代理服务器 =====

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3005;

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
    if (!content) {
        console.log('❌ 姓名提取失败: 内容为空');
        return '未知';
    }

    console.log('🔍 开始使用13种模式提取姓名...');
    console.log('📝 原始文本内容预览:', content.substring(0, 200) + (content.length > 200 ? '...' : ''));

    // 先尝试从"姓名："等明确标注中提取
    const patterns = [
        // 模式1: "姓名：张三"、"学生：李四"、"name：Wang"
        /(?:姓名|学生|name|Name)[：:\s]*([^\n\r,，。、\)]+)/i,

        // 模式2: "我叫XXX"、"我是XXX"、"我的名字是XXX"
        /(?:我叫|我是|我的名字是|我叫做的|我叫做)[：:\s]*([^\n\r,，。、\)]+)/i,

        // 模式3: "XXX的作业"、"XXX同学"
        /([\u4e00-\u9fa5]{2,4})(?:的作业|同学)/,

        // 模式4: 行首的2-4个汉字（可能是姓名）
        /^\s*([\u4e00-\u9fa5]{2,4})(?=\s|$|[，,。.])/m,

        // 模式5: 冒号后的姓名 "XXX: 张三"
        /([^\n\r]{0,10})[：:]\s*([\u4e00-\u9fa5]{2,4})/,

        // 模式6: 查找连续的2-4个汉字，前后有空格或标点
        /(?:^|[\s,，。、\(\)])\s*([\u4e00-\u9fa5]{2,4})\s*(?:$|[\s,，。、\(\)]|,|\.|。)/,

        // 模式7: 圆括号中的姓名 "(张三)"
        /\(([\u4e00-\u9fa5]{2,4})\)/,

        // 模式8: 方括号中的姓名 "[张三]"
        /\[([\u4e00-\u9fa5]{2,4})\]/,

        // 模式9: "学生姓名：XXX"、"姓名栏：XXX"
        /(?:学生姓名|姓名栏|学生名)[：:\s]*([^\n\r,，。、\)]+)/i,

        // 模式10: 姓名写在横线上方（如填空题风格）
        /姓名[：:\s]*\n\s*([\u4e00-\u9fa5]{2,4})/i,

        // 模式11: 姓名写在顶部居中位置
        /(?:^|\n)\s*([\u4e00-\u9fa5]{2,4})\s*(?=\n|$|姓名|学生|班级)/m,

        // 模式12: 姓名写在"___"或"——"下划线上方
        /_\s*([\u4e00-\u9fa5]{2,4})\s*_/,

        // 模式13: 查找所有2-4个汉字组合，选择最可能的姓名
        /[\u4e00-\u9fa5]{2,4}/g,
    ];

    // 尝试每种模式
    console.log(`\n🔎 尝试匹配 ${patterns.length} 种模式:\n`);
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        console.log(`🔍 模式 ${i + 1}: ${pattern}`);

        const match = content.match(pattern);

        // 跳过模式13（全局匹配），在后面单独处理
        if (i === 12) {
            console.log(`   ⏭️  跳过模式13，将在后面单独处理\n`);
            continue;
        }

        if (match) {
            let name;

            // 对于模式5（冒号后的姓名），取第二个分组
            if (i === 4) {
                name = match[2] ? match[2].trim() : '';
            } else {
                name = match[1] ? match[1].trim() : '';
            }

            console.log(`   📋 匹配结果:`, name ? `"${name}"` : 'null');

            if (name) {
                console.log(`   🔍 验证姓名: "${name}"`);
                // 过滤掉明显的非姓名词汇
                const excludeWords = [
                    '姓名', '学生', '名字', 'name', '班级', '学校', '年级',
                    '第', '题', '页', '日期', '科目', '姓名：', '学生：',
                    '数学', '语文', '英语', '物理', '化学', '生物',
                    '作业', '试卷', '考试', '练习', '答案',
                    '我的', '这个', '那个', '一班', '二班', '三年级',
                    '教师', '老师', '姓名:', '学生:', '班级', '小学', '中学'
                ];

                // 检查是否包含排除词汇
                const hasExcludedWord = excludeWords.some(word => name.includes(word));
                console.log(`   🚫 排除词汇检查: ${hasExcludedWord ? '包含 "' + excludeWords.find(w => name.includes(w)) + '"' : '通过'}`);

                if (!hasExcludedWord) {
                    // 确保是合理的姓名长度（2-4个汉字）
                    const isValidLength = name.length >= 2 && name.length <= 4;
                    console.log(`   📏 长度检查: ${name.length}个字符 ${isValidLength ? '✓' : '✗ (应为2-4个)'}`);

                    if (isValidLength) {
                        // 确保是纯汉字（排除数字、英文等）
                        const isChinese = /^[\u4e00-\u9fa5]+$/.test(name);
                        console.log(`   🔤 字符类型检查: ${isChinese ? '纯汉字 ✓' : '包含非汉字 ✗'}`);

                        if (isChinese) {
                            console.log(`\n✅ 模式${i + 1}验证通过! 最终提取姓名: "${name}"`);
                            console.log('=' .repeat(50));
                            return name;
                        }
                    }
                } else {
                    console.log(`   ❌ 验证失败: 包含排除词汇`);
                }
            } else {
                console.log(`   ⚠️  匹配结果为空，跳过`);
            }
        } else {
            console.log(`   ❌ 无匹配项`);
        }
        console.log(''); // 空行分隔
    }

    // 特殊处理模式13：全局匹配所有2-4个汉字
    console.log(`\n🔍 模式13: 全局扫描所有2-4个汉字`);
    const allMatches = content.match(patterns[12]);
    if (allMatches) {
        console.log(`   📊 找到 ${allMatches.length} 个候选词:`, allMatches);
        const excludeWords = [
            '姓名', '学生', '名字', 'name', '班级', '学校', '年级',
            '第', '题', '页', '日期', '科目', '姓名：', '学生：',
            '数学', '语文', '英语', '物理', '化学', '生物',
            '作业', '试卷', '考试', '练习', '答案',
            '我的', '这个', '那个', '一班', '二班', '三年级',
            '教师', '老师', '姓名:', '学生:', '班级', '小学', '中学'
        ];

        console.log(`   🔍 逐一验证候选词...`);
        // 遍历所有匹配，优先选择位置靠前、符合条件的姓名
        for (let i = 0; i < allMatches.length; i++) {
            const name = allMatches[i];
            console.log(`   [${i + 1}/${allMatches.length}] 检查: "${name}"`);

            const isValidLength = name.length >= 2 && name.length <= 4;
            const isChinese = /^[\u4e00-\u9fa5]+$/.test(name);
            const isNotExcluded = !excludeWords.includes(name);

            console.log(`      - 长度检查: ${isValidLength ? '✓' : '✗'}`);
            console.log(`      - 纯汉字: ${isChinese ? '✓' : '✗'}`);
            console.log(`      - 非排除词: ${isNotExcluded ? '✓' : '✗'}`);

            if (isValidLength && isChinese && isNotExcluded) {
                console.log(`\n✅ 模式13验证通过! 最终提取姓名: "${name}"`);
                console.log('=' .repeat(50));
                return name;
            }
        }
        console.log(`   ❌ 模式13: 所有候选词均未通过验证`);
    } else {
        console.log(`   ❌ 模式13: 未找到任何候选词`);
    }
    console.log(''); // 空行分隔

    // 如果所有模式都失败，尝试提取第一个连续的中文词
    // 但要排除明显的非姓名词汇
    console.log(`\n🔄 启动fallback机制: 提取首个连续中文词`);
    const chineseMatches = content.match(/[\u4e00-\u9fa5]{2,4}/g);
    if (chineseMatches) {
        console.log(`   📋 找到 ${chineseMatches.length} 个中文词:`, chineseMatches);
        const excludeWords = [
            '姓名', '学生', '班级', '学校', '年级', '第', '题', '页', '日期',
            '数学', '语文', '英语', '作业', '试卷', '考试', '我的'
        ];
        console.log(`   🔍 逐一检查...`);

        for (const name of chineseMatches) {
            const isExcluded = excludeWords.includes(name);
            const isValidLength = name.length >= 2 && name.length <= 4;
            console.log(`   - "${name}": 长度${isValidLength ? '✓' : '✗'}, 排除词${isExcluded ? '✓' : '✗'}`);

            if (!isExcluded && isValidLength) {
                console.log(`\n✅ fallback成功! 提取姓名: "${name}"`);
                console.log('=' .repeat(50));
                return name;
            }
        }
        console.log(`   ❌ fallback失败: 所有中文词均被过滤`);
    } else {
        console.log(`   ❌ fallback失败: 未找到任何中文词`);
    }

    console.log(`\n❌ 所有13种模式和fallback均失败`);
    console.log('=' .repeat(50));
    console.log(`🎯 最终结果: "未知"`);
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

        const prompt = `请仔细识别图片中的学生姓名。请按照以下优先级逐一尝试：

【优先级1】明确标注：
- 查找"姓名："、"学生："、"name："、"姓名是："、"学生姓名："等明确标注
- 查找"我叫XXX"、"我是XXX"、"我的名字是XXX"、"XXX的作业"等自我说明

【优先级2】作业顶部：
- 识别作业第一行（通常是页眉位置）的姓名
- 识别试卷标题下的姓名
- 识别靠近页面上方的2-4个汉字

【优先级3】常见格式：
- "XXX同学"格式
- 姓名写在圆圈或方框中
- 姓名写在横线上
- 英文名：Zhang San, Li Wei 等

【重要提示】：
- 姓名通常是2-4个汉字组成
- 排除：班级、学校、科目、日期、页码、题目编号等
- 如果有多个候选姓名，选择最明显、最常见的一个

请严格按照以下JSON格式返回（不要添加任何其他文字）：
{
  "studentName": "张三"
}

如果完全无法识别，填写"未知"。`;

        console.log('🚀 发送图片到Moonshot Vision API进行识别...');
        console.log(`📐 图片大小: ${Math.round(base64Image.length / 1024)} KB`);

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

        console.log('✅ Moonshot API响应成功!');
        console.log('=' .repeat(50));
        console.log('📋 API原始响应内容:');
        console.log(content);
        console.log('=' .repeat(50));

        // 尝试解析JSON格式
        let studentName = '未知';
        console.log('\n🔍 开始提取姓名...\n');

        try {
            // 方法1: 尝试解析JSON
            console.log('🔎 方法1: 尝试JSON解析');
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log('   📝 发现JSON格式尝试解析...');
                const data = JSON.parse(jsonMatch[0]);
                if (data.studentName && data.studentName !== '未知') {
                    studentName = data.studentName;
                    console.log(`   ✅ JSON解析成功! 学生姓名: "${studentName}"`);
                    console.log('=' .repeat(50));
                } else {
                    console.log('   ⚠️ JSON中未找到有效姓名或为"未知"');
                }
            } else {
                console.log('   ❌ 未发现JSON格式');
            }
        } catch (e) {
            console.log('   ❌ JSON解析失败:', e.message);
        }

        // 方法2: 如果JSON解析失败或未找到姓名，使用文本提取
        if (studentName === '未知' || !studentName) {
            console.log('\n🔎 方法2: 使用智能文本提取算法');
            console.log('=' .repeat(50));
            studentName = extractStudentName(content);
            console.log('=' .repeat(50));
        }

        console.log(`\n🎯 最终识别结果: "${studentName}"`);
        console.log('=' .repeat(50));

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
