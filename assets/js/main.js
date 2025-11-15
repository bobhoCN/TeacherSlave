// ===== 主应用文件 =====

// 当前活动页面
let currentSection = 'homeSection';

// 页面切换函数
function showSection(sectionId) {
    // 隐藏所有页面
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // 显示目标页面
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionId;
    }
}

// 初始化应用
function initApp() {
    console.log('数学作业批改系统启动');

    // 绑定导航按钮事件
    bindNavigationEvents();

    // 绑定通用事件
    bindCommonEvents();

    // 显示首页
    showSection('homeSection');
}

// 绑定导航事件
function bindNavigationEvents() {
    // 首页按钮
    document.getElementById('cameraBtn')?.addEventListener('click', () => {
        showSection('cameraSection');
        initCamera();
    });

    document.getElementById('uploadBtn')?.addEventListener('click', () => {
        showSection('uploadSection');
    });

    // 返回按钮
    document.getElementById('backFromCamera')?.addEventListener('click', () => {
        stopCamera();
        showSection('homeSection');
    });

    document.getElementById('backFromUpload')?.addEventListener('click', () => {
        resetUploadArea();
        showSection('homeSection');
    });

    document.getElementById('backToHome')?.addEventListener('click', () => {
        resetUploadArea();
        showSection('homeSection');
    });

    // 姓名确认页按钮
    document.getElementById('backToProcessing')?.addEventListener('click', () => {
        showSection('processingSection');
    });

    document.getElementById('confirmNameBtn')?.addEventListener('click', () => {
        confirmStudentName();
    });

    document.getElementById('regradeBtn')?.addEventListener('click', () => {
        regradeImage();
    });

    // 上传相关按钮
    document.getElementById('selectFileBtn')?.addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput')?.addEventListener('change', handleFileSelect);

    document.getElementById('processImageBtn')?.addEventListener('click', processSelectedImage);
}

// 绑定通用事件
function bindCommonEvents() {
    // 文件拖拽事件
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleFile(file);
            }
        });
    }
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// 处理选中的文件
function handleFile(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        const uploadArea = document.getElementById('uploadArea');
        const previewContainer = document.getElementById('previewContainer');

        previewImage.src = e.target.result;
        uploadArea.style.display = 'none';
        previewContainer.style.display = 'block';
    };

    reader.readAsDataURL(file);
}

// 重置上传区域
function resetUploadArea() {
    const previewImage = document.getElementById('previewImage');
    const uploadArea = document.getElementById('uploadArea');
    const previewContainer = document.getElementById('previewContainer');
    const fileInput = document.getElementById('fileInput');

    if (previewImage) {
        previewImage.src = '';
    }

    if (uploadArea) {
        uploadArea.style.display = 'block';
    }

    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    if (fileInput) {
        fileInput.value = '';
    }

    // 清理全局变量
    if (window.selectedImageData) {
        delete window.selectedImageData;
    }

    console.log('上传区域已重置');
}

// 处理选中的图片进行批改
function processSelectedImage() {
    const previewImage = document.getElementById('previewImage');
    if (previewImage.src) {
        // 保存图片数据
        window.selectedImageData = previewImage.src;

        // 显示处理页面
        showProcessingPage();

        // 开始识别和批改
        startGradingProcess();
    }
}

// 显示批改进度页面
function showProcessingPage() {
    showSection('processingSection');
    updateProgressStep(0);
    updateProcessingTitle('正在准备批改...', '请稍候，系统正在初始化');
    updateProgressBar(0);
    updateCurrentTask('等待开始', '即将开始处理您的作业');
}

// 显示姓名确认页面
function showNameConfirmPage(studentName) {
    const nameInput = document.getElementById('studentNameInput');
    if (nameInput) {
        nameInput.value = studentName || '';
        // 添加日志
        if (studentName && studentName !== '未知') {
            console.log('✓ 姓名识别成功:', studentName);
        } else {
            console.log('⚠️ 姓名识别失败或未找到，请手动输入');
        }
    }
    showSection('confirmSection');
}

// 确认学生姓名并继续
function confirmStudentName() {
    const nameInput = document.getElementById('studentNameInput');
    const studentName = nameInput.value.trim();

    if (!studentName) {
        alert('请输入学生姓名');
        nameInput.focus();
        return;
    }

    // 保存确认的姓名
    window.confirmedStudentName = studentName;

    // 继续批改
    continueGrading();
}

// 重新识别
function regradeImage() {
    // 重置上传区域
    resetUploadArea();

    // 返回处理页
    showSection('processingSection');

    // 重新开始批改
    startGradingProcess();
}

// 继续批改（姓名确认后）
async function continueGrading() {
    try {
        // 更新进度
        updateProgressStep(2);

        // 获取之前识别的题目
        const recognitionResult = window.recognitionResult;
        if (!recognitionResult) {
            throw new Error('识别结果丢失');
        }

        // 更新学生姓名为确认的姓名
        recognitionResult.studentName = window.confirmedStudentName;

        // 批改评分
        const gradingResult = await gradeHomework(recognitionResult);

        // 显示结果
        showResultPage(gradingResult);

    } catch (error) {
        console.error('继续批改失败:', error);
        showError('批改失败: ' + error.message);
    }
}

// 更新进度步骤
function updateProgressStep(stepIndex) {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        if (index <= stepIndex) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

// 更新处理标题和详情
function updateProcessingTitle(title, detail) {
    const titleElement = document.getElementById('processingTitle');
    const detailElement = document.getElementById('processingDetail');
    if (titleElement) titleElement.textContent = title;
    if (detailElement) detailElement.textContent = detail;
}

// 更新进度条
function updateProgressBar(percentage) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }
    if (progressText) {
        progressText.textContent = Math.round(percentage) + '%';
    }
}

// 更新当前任务
function updateCurrentTask(title, description) {
    const currentTask = document.getElementById('currentTask');
    const taskTitle = currentTask?.querySelector('.task-title');
    const taskDescription = currentTask?.querySelector('.task-description');

    if (taskTitle) taskTitle.textContent = title;
    if (taskDescription) taskDescription.textContent = description;

    // 添加loading动画
    if (currentTask) {
        currentTask.classList.add('loading');
        // 2秒后移除loading状态，避免动画一直播放
        setTimeout(() => {
            currentTask.classList.remove('loading');
        }, 2000);
    }
}

// 显示题目进度
function showQuestionProgress() {
    const progressElement = document.getElementById('questionProgress');
    if (progressElement) {
        progressElement.style.display = 'flex';
    }
}

// 更新题目进度
function updateQuestionProgress(current, total, detail) {
    const currentNumElement = document.getElementById('currentQuestionNum');
    const totalQuestionsElement = document.getElementById('totalQuestions');
    const detailElement = document.getElementById('questionProgressDetail');

    if (currentNumElement) currentNumElement.textContent = current;
    if (totalQuestionsElement) totalQuestionsElement.textContent = total;
    if (detailElement) detailElement.textContent = detail || '';

    showQuestionProgress();
}

// 平滑更新进度条
function animateProgressBar(from, to, duration = 300, callback) {
    const start = performance.now();
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        const currentValue = from + (to - from) * easedProgress;

        if (progressFill) {
            progressFill.style.width = currentValue + '%';
        }
        if (progressText) {
            progressText.textContent = Math.round(currentValue) + '%';
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else if (callback) {
            callback();
        }
    }

    requestAnimationFrame(update);
}

// 缓动函数
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// 渲染数学公式
function renderMath() {
    if (typeof katex === 'undefined') {
        console.warn('KaTeX 未加载，跳过公式渲染');
        return;
    }

    document.querySelectorAll('.math-formula').forEach(element => {
        const latex = element.dataset.latex;
        if (latex) {
            try {
                katex.render(latex, element, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                console.error('公式渲染错误:', e);
                element.textContent = latex;
            }
        }
    });
}

// 错误提示
function showError(message) {
    alert('错误: ' + message);
    console.error(message);
}

// 成功提示
function showSuccess(message) {
    console.log('成功: ' + message);
}

// 显示结果页面
function showResultPage(data) {
    // 渲染学生姓名
    const studentNameElement = document.getElementById('studentName');
    if (studentNameElement && data.studentName) {
        studentNameElement.textContent = `学生姓名：${data.studentName}`;
    }

    // 渲染题目列表
    const questionsListElement = document.getElementById('questionsList');
    if (questionsListElement && data.questions) {
        questionsListElement.innerHTML = '';

        data.questions.forEach((question, index) => {
            const questionElement = createQuestionElement(question, index);
            questionsListElement.appendChild(questionElement);
        });
    }

    // 渲染数学公式
    renderMath();

    // 显示结果页面
    showSection('resultSection');
}

// 创建题目元素
function createQuestionElement(question, index) {
    const div = document.createElement('div');
    div.className = 'question-item card';

    const isCorrect = question.isCorrect;
    const statusClass = isCorrect ? 'correct' : 'incorrect';
    const statusText = isCorrect ? '正确' : '错误';

    div.innerHTML = `
        <div class="question-header">
            <span class="question-number">第${index + 1}题</span>
        </div>
        <div class="question-content">
            <span class="label">题目：</span>
            <div class="math-formula" data-latex="${escapeLatex(question.question || '')}"></div>
        </div>
        <div class="answer-content">
            <span class="label">学生答案：</span>
            <div class="math-formula" data-latex="${escapeLatex(question.studentAnswer || '')}"></div>
        </div>
        <div class="answer-content correct">
            <span class="label">正确答案：</span>
            <div class="math-formula" data-latex="${escapeLatex(question.correctAnswer || '')}"></div>
        </div>
        <div class="result">
            <span class="status ${statusClass}">
                <span>${statusText}</span>
            </span>
            <span class="score">得分：${question.score || 0}/${question.fullScore || 10}</span>
        </div>
    `;

    return div;
}

// 转义 LaTeX 特殊字符
function escapeLatex(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/_/g, '\\_')
        .replace(/#/g, '\\#')
        .replace(/\$/g, '\\$')
        .replace(/%/g, '\\%')
        .replace(/&/g, '\\&')
        .replace(/~/g, '\\~{}')
        .replace(/\^/g, '\\^{}');
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

// 导出进度相关函数到全局
window.updateProgressStep = updateProgressStep;
window.updateProcessingTitle = updateProcessingTitle;
window.updateProgressBar = updateProgressBar;
window.updateCurrentTask = updateCurrentTask;
window.animateProgressBar = animateProgressBar;
window.updateQuestionProgress = updateQuestionProgress;
