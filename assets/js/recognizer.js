// ===== 图像识别模块 =====

// 本地代理服务器配置
const LOCAL_API_URL = 'http://localhost:3002/api';

// 将 base64 转换为 blob
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
}

// 识别学生姓名
async function recognizeStudentName(imageData) {
    try {
        console.log('正在识别学生姓名...');
        updateProgressStep(0);

        // 转换为 blob
        const blob = dataURLtoBlob(imageData);

        // 创建 FormData
        const formData = new FormData();
        formData.append('image', blob, 'image.png');

        // 发送到本地代理
        const response = await fetch(`${LOCAL_API_URL}/recognize/name`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '识别失败');
        }

        const result = await response.json();
        console.log('姓名识别结果:', result.studentName);

        return result.studentName || '未知';

    } catch (error) {
        console.error('姓名识别错误:', error);
        throw error;
    }
}

// 识别题目和答案
async function recognizeQuestions(imageData) {
    try {
        console.log('正在识别题目和答案...');
        updateProgressStep(1);

        // 转换为 blob
        const blob = dataURLtoBlob(imageData);

        // 创建 FormData
        const formData = new FormData();
        formData.append('image', blob, 'image.png');

        // 发送到本地代理
        const response = await fetch(`${LOCAL_API_URL}/recognize/questions`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '识别失败');
        }

        const result = await response.json();
        console.log('题目识别结果:', result.questions);

        return result.questions || [];

    } catch (error) {
        console.error('题目识别错误:', error);
        throw error;
    }
}

// 完整的识别流程
async function recognizeHomework(imageData) {
    try {
        // 识别学生姓名
        const studentName = await recognizeStudentName(imageData);

        // 识别题目和答案
        const questions = await recognizeQuestions(imageData);

        // 保存识别结果
        window.recognitionResult = {
            studentName,
            questions
        };

        // 显示姓名确认页面
        showNameConfirmPage(studentName);

        // 等待用户确认，不会自动返回
        return null;

    } catch (error) {
        console.error('识别流程失败:', error);
        throw new Error('识别失败: ' + error.message);
    }
}

// 备用识别方案（使用模拟数据）
async function recognizeImageLocal(imageData) {
    console.log('使用本地模拟数据（代理服务未启动）...');
    console.log('提示：请先启动后端代理服务：npm start');

    return {
        studentName: '模拟-学生',
        questions: [
            {
                question: '1 + 1 = ?',
                studentAnswer: '2',
                correctAnswer: '2',
                fullScore: 10
            },
            {
                question: '2 + 2 = ?',
                studentAnswer: '4',
                correctAnswer: '4',
                fullScore: 10
            },
            {
                question: '3 \\times 3 = ?',
                studentAnswer: '9',
                correctAnswer: '9',
                fullScore: 10
            }
        ]
    };
}

// 开始批改流程
async function startGradingProcess() {
    try {
        console.log('开始批改流程...');

        if (!window.selectedImageData) {
            throw new Error('没有选择图片');
        }

        // 尝试连接代理服务器
        let recognitionResult;
        try {
            const response = await fetch(`${LOCAL_API_URL}/health`);
            if (response.ok) {
                // 代理服务在线，使用真实识别
                recognitionResult = await recognizeHomework(window.selectedImageData);
            } else {
                throw new Error('代理服务不可用');
            }
        } catch (proxyError) {
            console.warn('代理服务不可用，使用模拟数据:', proxyError.message);

            // 代理服务不可用，使用模拟数据演示
            recognitionResult = await recognizeImageLocal(window.selectedImageData);

            // 显示提示
            setTimeout(() => {
                alert('提示：代理服务未启动，使用模拟数据进行演示。\n\n要使用真实识别功能，请先运行：npm start');
            }, 500);
        }

        // 如果识别成功并返回结果（模拟数据），直接显示姓名确认页
        if (recognitionResult) {
            console.log('识别结果:', recognitionResult);

            // 保存识别结果
            window.recognitionResult = recognitionResult;

            // 显示姓名确认页面
            showNameConfirmPage(recognitionResult.studentName);
        }
        // 如果使用真实识别，recognizeHomework已经处理了显示确认页面的逻辑

    } catch (error) {
        console.error('批改流程失败:', error);
        showError('批改失败: ' + error.message + '\n\n请检查代理服务是否启动（npm start）');

        // 返回首页
        setTimeout(() => {
            showSection('homeSection');
        }, 2000);
    }
}

// 检查代理服务状态
async function checkProxyStatus() {
    try {
        const response = await fetch(`${LOCAL_API_URL}/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

// 导出函数
window.recognizeStudentName = recognizeStudentName;
window.recognizeQuestions = recognizeQuestions;
window.recognizeHomework = recognizeHomework;
window.recognizeImageLocal = recognizeImageLocal;
window.startGradingProcess = startGradingProcess;
window.checkProxyStatus = checkProxyStatus;
window.showNameConfirmPage = showNameConfirmPage;
