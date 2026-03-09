const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdf = require('pdf-parse');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    const { examType, subject, examYear } = req.body;

    if (!examType || !subject || !examYear) {
      return res.status(400).json({
        error: 'Exam type, subject and exam year are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    // Parse PDF
    const data = await pdf(req.file.buffer);
    const text = data.text;

    // Clean text
    const cleanedText = text.replace(/\r/g, '');

const questionBlocks = cleanedText
  .split(/(?=^\d+\.\s)/gm)
  .map(q => q.trim())
  .filter(q => /^\d+\./.test(q));

    // Extract structured questions
 const questions = questionBlocks.map((block, index) => {

  // Extract options
  const optionMatches = block.match(/[A-E]\.\s.*?(?=\n[A-E]\.|$)/gs);

  let options = [];

  if (optionMatches) {
    options = optionMatches.map(opt =>
      opt.replace(/[A-E]\.\s/, '').trim()
    );
  }

  // Remove options from question text
  let questionText = block;

  if (optionMatches) {
    optionMatches.forEach(opt => {
      questionText = questionText.replace(opt, '');
    });
  }

  // Remove the "1." number from question
  questionText = questionText.replace(/^\d+\.\s*/, '').trim();

  return {
    examType,
    subject,
    examYear,
    questionNumber: index + 1,
    questionText,
    options
  };
});

    // ✅ SEND RESPONSE ONCE
    res.json({
      success: true,
      totalQuestions: questions.length,
      questions
    });

  } catch (error) {
    console.error("PARSING ERROR:", error);
    res.status(500).json({ error: "Failed to process PDF: " + error.message });
  }
});

module.exports = router;