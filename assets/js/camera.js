// ===== 摄像头功能模块 =====

let cameraStream = null;

// 初始化摄像头
async function initCamera() {
    try {
        console.log('正在启动摄像头...');

        // 获取摄像头权限
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // 优先使用后置摄像头
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });

        cameraStream = stream;

        // 设置视频源
        const video = document.getElementById('cameraVideo');
        if (video) {
            video.srcObject = stream;
        }

        console.log('摄像头启动成功');

        // 绑定拍照按钮事件
        bindCaptureEvent();

    } catch (error) {
        console.error('摄像头启动失败:', error);
        showError('无法访问摄像头: ' + error.message + '\n\n请检查摄像头权限设置，然后刷新页面重试。');

        // 自动切换到上传模式
        setTimeout(() => {
            showSection('uploadSection');
        }, 2000);
    }
}

// 绑定拍照事件
function bindCaptureEvent() {
    const captureBtn = document.getElementById('captureBtn');
    if (captureBtn) {
        // 移除旧的事件监听器
        captureBtn.removeEventListener('click', captureImage);

        // 添加新的事件监听器
        captureBtn.addEventListener('click', captureImage);
    }
}

// 拍照
function captureImage() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('canvas');

    if (!video || !canvas) {
        showError('摄像头或画布未找到');
        return;
    }

    try {
        // 设置画布尺寸
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 绘制当前视频帧到画布
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 转换为图片数据
        const imageData = canvas.toDataURL('image/png');

        // 保存图片数据
        window.selectedImageData = imageData;

        console.log('拍照成功，图片大小:', imageData.length);

        // 显示拍照成功的视觉反馈
        flashCaptureButton();

        // 稍后开始批改
        setTimeout(() => {
            showProcessingPage();
            startGradingProcess();
        }, 500);

    } catch (error) {
        console.error('拍照失败:', error);
        showError('拍照失败: ' + error.message);
    }
}

// 拍照按钮闪烁效果
function flashCaptureButton() {
    const captureBtn = document.getElementById('captureBtn');
    if (captureBtn) {
        captureBtn.style.transform = 'scale(0.95)';
        captureBtn.style.background = '#34C759';

        setTimeout(() => {
            captureBtn.style.transform = '';
            captureBtn.style.background = '';
        }, 200);
    }
}

// 停止摄像头
function stopCamera() {
    if (cameraStream) {
        console.log('正在关闭摄像头...');

        // 停止所有视频轨道
        cameraStream.getTracks().forEach(track => {
            track.stop();
        });

        cameraStream = null;

        // 清除视频源
        const video = document.getElementById('cameraVideo');
        if (video) {
            video.srcObject = null;
        }
    }
}

// 检查摄像头支持
function checkCameraSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('此浏览器不支持摄像头');
        return false;
    }
    return true;
}

// 获取摄像头设备列表
async function getCameraDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
        console.error('获取摄像头设备列表失败:', error);
        return [];
    }
}

// 切换摄像头（前置/后置）
async function switchCamera() {
    if (!cameraStream) {
        return;
    }

    const currentVideoTrack = cameraStream.getVideoTracks()[0];
    const currentFacingMode = currentVideoTrack.getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    try {
        // 停止当前流
        stopCamera();

        // 重新启动摄像头
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: newFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });

        cameraStream = stream;
        const video = document.getElementById('cameraVideo');
        if (video) {
            video.srcObject = stream;
        }

        console.log('摄像头切换成功，当前模式:', newFacingMode);

    } catch (error) {
        console.error('摄像头切换失败:', error);
        showError('摄像头切换失败: ' + error.message);
    }
}

// 获取视频流状态
function getCameraStatus() {
    if (!cameraStream) {
        return '未初始化';
    }

    const videoTrack = cameraStream.getVideoTracks()[0];
    if (!videoTrack) {
        return '无视频轨道';
    }

    if (videoTrack.readyState === 'live') {
        return '运行中';
    } else if (videoTrack.readyState === 'starting') {
        return '启动中';
    } else {
        return '已停止';
    }
}

// 页面卸载时清理摄像头
window.addEventListener('beforeunload', () => {
    stopCamera();
});

// 导出函数（供其他模块使用）
window.initCamera = initCamera;
window.stopCamera = stopCamera;
window.captureImage = captureImage;
window.switchCamera = switchCamera;
