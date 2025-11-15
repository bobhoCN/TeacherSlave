// ===== 批改评分模块 =====

// 批改作业
function gradeHomework(recognitionResult) {
    console.log('开始批改评分...');

    const { studentName, questions } = recognitionResult;

    // 批改每道题目
    const gradedQuestions = questions.map((question, index) => {
        // 使用容错比较
        const isCorrect = compareAnswersWithTolerance(
            question.studentAnswer,
            question.correctAnswer
        );

        return {
            ...question,
            isCorrect,
            score: isCorrect ? (question.fullScore || 10) : 0
        };
    });

    // 计算总分
    const totalScore = gradedQuestions.reduce((sum, q) => sum + q.score, 0);
    const totalFullScore = gradedQuestions.reduce((sum, q) => sum + (q.fullScore || 10), 0);

    console.log('批改完成:', {
        studentName,
        totalScore,
        totalFullScore,
        questions: gradedQuestions
    });

    return {
        studentName,
        totalScore,
        totalFullScore,
        questions: gradedQuestions
    };
}

// 比较答案
function compareAnswers(studentAnswer, correctAnswer) {
    if (!studentAnswer || !correctAnswer) {
        console.log('答案比较 - 缺失答案:', { studentAnswer, correctAnswer });
        return false;
    }

    // 标准化答案
    const normalizedStudent = normalizeAnswer(studentAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);

    const isCorrect = normalizedStudent === normalizedCorrect;

    console.log('=== 答案比较详情 ===', {
        学生原始答案: studentAnswer,
        正确原始答案: correctAnswer,
        学生标准化答案: normalizedStudent,
        正确标准化答案: normalizedCorrect,
        比较结果: isCorrect ? '✓ 正确' : '✗ 错误'
    });
    console.log('====================');

    return isCorrect;
}

// 标准化答案
function normalizeAnswer(answer) {
    if (!answer) return '';

    let normalized = String(answer)
        .trim() // 去除首尾空格
        .toLowerCase() // 转换为小写

    // 如果是完整的计算式（如 "483 - 333 = 150"），提取等号右边的结果
    const calculationMatch = normalized.match(/(.+?)(?:=|equals)(.+)/i);
    if (calculationMatch) {
        // 提取等号右边的值作为最终答案
        normalized = calculationMatch[2].trim();
        console.log('提取计算结果:', calculationMatch[1], '=', calculationMatch[2]);
    }

    // 标准化常见的数学符号和表示
    normalized = normalized
        // 统一无穷大符号
        .replace(/[－—−]/g, '-') // 统一减号
        .replace(/∞/g, 'infinity') // 无穷大符号
        .replace(/[，,]/g, ',') // 统一逗号
        .replace(/[。.]/g, '.') // 统一句号
        .replace(/[（）()]/g, '') // 去除括号
        .replace(/[$￥]/g, '') // 去除货币符号
        .replace(/[{}]/g, '') // 去除LaTeX大括号
        .replace(/\\cdot/g, '*') // 乘号
        .replace(/\\times/g, '*') // 乘号
        .replace(/\\div/g, '/') // 除号
        .replace(/\\pm/g, '+-') // 正负号
        .replace(/\\leq/g, '<=') // 小于等于
        .replace(/\\geq/g, '>=') // 大于等于
        .replace(/\\neq/g, '!=') // 不等于
        .replace(/\\approx/g, '~') // 约等于
        .replace(/\\in/g, 'in') // 属于
        .replace(/\\cup/g, 'U') // 并集
        .replace(/\\cap/g, '∩') // 交集
        .replace(/\\emptyset/g, '∅') // 空集
        .replace(/\\subset/g, '⊂') // 真子集
        .replace(/\\subseteq/g, '⊆') // 子集
        .replace(/\\supset/g, '⊃') // 真包含
        .replace(/\\supseteq/g, '⊇') // 包含
        .replace(/\\forall/g, 'forall') // 任取
        .replace(/\\exists/g, 'exists') // 存在
        .replace(/\\infinity/g, 'infinity') // 无穷大
        // 标准化分数表示
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2') // 分数转换为 a/b
        // 标准化根号
        .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)') // 根号
        .replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, 'sqrt[$1]($2)') // n次根号
        // 标准化上标
        .replace(/\^\{([^}]+)\}/g, '^($1)') // 上标
        .replace(/\_\{([^}]+)\}/g, '_($1)') // 下标
        // 标准化空格
        .replace(/\s+/g, ''); // 去除所有内部空格

    return normalized;
}

// 高级答案比较（支持容错）
function compareAnswersWithTolerance(studentAnswer, correctAnswer) {
    if (!studentAnswer || !correctAnswer) {
        console.log('容错比较 - 缺失答案:', { studentAnswer, correctAnswer });
        return false;
    }

    // 基本比较
    const basicResult = compareAnswers(studentAnswer, correctAnswer);
    if (basicResult) {
        console.log('✓ 基础比较: 正确');
        return true;
    }

    console.log('✗ 基础比较失败，使用容错比较...');

    // 数值答案的容错比较
    const studentNum = parseFloat(studentAnswer);
    const correctNum = parseFloat(correctAnswer);

    if (!isNaN(studentNum) && !isNaN(correctNum)) {
        // 允许小的误差（0.01%）
        const tolerance = Math.abs(correctNum) * 0.0001;
        const diff = Math.abs(studentNum - correctNum);
        const withinTolerance = diff <= tolerance;

        console.log('数值容错比较:', {
            学生数值: studentNum,
            正确数值: correctNum,
            差值: diff,
            容忍度: tolerance,
            是否在容忍范围内: withinTolerance
        });

        if (withinTolerance) {
            console.log('✓ 数值容错比较: 正确');
            return true;
        }
    }

    // 分数形式的比较
    const studentFraction = parseFraction(studentAnswer);
    const correctFraction = parseFraction(correctAnswer);

    if (studentFraction && correctFraction) {
        const fractionDiff = Math.abs(studentFraction - correctFraction);
        const withinFractionTolerance = fractionDiff < 0.0001;

        console.log('分数比较:', {
            学生分数: studentFraction,
            正确分数: correctFraction,
            差值: fractionDiff,
            是否在容忍范围内: withinFractionTolerance
        });

        if (withinFractionTolerance) {
            console.log('✓ 分数比较: 正确');
            return true;
        }
    }

    console.log('✗ 所有比较方法都失败: 错误');
    return false;
}

// 解析分数
function parseFraction(fractionStr) {
    const match = fractionStr.match(/^(\d+)\/(\d+)$/);
    if (match) {
        return parseFloat(match[1]) / parseFloat(match[2]);
    }
    return null;
}

// 生成评语
function generateComment(gradedQuestions) {
    const correctCount = gradedQuestions.filter(q => q.isCorrect).length;
    const totalCount = gradedQuestions.length;
    const accuracy = (correctCount / totalCount) * 100;

    if (accuracy === 100) {
        return '完美！所有答案都正确，继续保持！';
    } else if (accuracy >= 80) {
        return '很好！大部分答案正确，再仔细一些就更棒了！';
    } else if (accuracy >= 60) {
        return '不错！还有进步空间，继续努力！';
    } else if (accuracy >= 40) {
        return '需要加强练习，加油！';
    } else {
        return '需要更加认真地学习，建议复习相关知识点。';
    }
}

// 分析错误类型
function analyzeErrors(gradedQuestions) {
    const errors = gradedQuestions
        .filter(q => !q.isCorrect)
        .map(q => ({
            question: q.question,
            studentAnswer: q.studentAnswer,
            correctAnswer: q.correctAnswer
        }));

    if (errors.length === 0) {
        return '无错误';
    }

    // 可以在这里添加更复杂的错误分析逻辑
    return errors;
}

// 计算详细统计
function calculateStats(gradedQuestions) {
    const stats = {
        total: gradedQuestions.length,
        correct: 0,
        incorrect: 0,
        totalScore: 0,
        totalFullScore: 0,
        accuracy: 0
    };

    gradedQuestions.forEach(q => {
        if (q.isCorrect) {
            stats.correct++;
        } else {
            stats.incorrect++;
        }

        stats.totalScore += q.score || 0;
        stats.totalFullScore += q.fullScore || 10;
    });

    stats.accuracy = stats.total > 0
        ? (stats.correct / stats.total) * 100
        : 0;

    return stats;
}

// 导出函数
window.gradeHomework = gradeHomework;
window.compareAnswers = compareAnswers;
window.normalizeAnswer = normalizeAnswer;
window.compareAnswersWithTolerance = compareAnswersWithTolerance;
window.generateComment = generateComment;
window.analyzeErrors = analyzeErrors;
window.calculateStats = calculateStats;
