const express = require('express');
const router = express.Router();
const { addQuestion, getQuestions, getAllSubjectsAndYears } = require('../controllers/questionController');

// Route to add a question
router.post('/', addQuestion);

// Route to get questions (handles filters automatically)
router.get('/', getQuestions);

router.get('/subjects-years', getAllSubjectsAndYears);

module.exports = router;