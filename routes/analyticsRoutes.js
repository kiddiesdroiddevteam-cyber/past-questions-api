const express = require('express');
const router = express.Router();
const { getTotalUsers, getActiveUsers, getTotalPracticeTest, getPracticeTestsByMode, getPracticeTestsByExam } = require('../controllers/analytics/analyticsController');


router.get('/total-users', getTotalUsers);
router.get('/active-users', getActiveUsers);
router.get('/total-practice-tests', getTotalPracticeTest);
router.get('/practice-tests-by-mode', getPracticeTestsByMode);
router.get('/practice-tests-by-exam', getPracticeTestsByExam);


module.exports = router;