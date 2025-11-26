const Question = require('../models/Question');

// @desc    Add a new past question
// @route   POST /api/questions
// exports.addQuestion = async (req, res) => {
//   try {
//     const { questionText, options, correctAnswer, examType, examYear, subject } = req.body;

//     const newQuestion = new Question({
//       questionText,
//       options,
//       correctAnswer,
//       examType,
//       examYear,
//       subject
//     });

//     const savedQuestion = await newQuestion.save();
//     res.status(201).json(savedQuestion);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.addQuestion = async (req, res) => {
  try {
    const body = req.body;

    // 1. Check if the input is an Array (Bulk Upload)
    if (Array.isArray(body)) {
      
      if (body.length === 0) {
        return res.status(400).json({ error: "Question array cannot be empty" });
      }

      // insertMany is the most efficient way to save an array of documents
      const savedQuestions = await Question.insertMany(body);
      return res.status(201).json(savedQuestions);
    }

    // 2. Handle Single Object (Backward compatibility)
    const { questionText, options, correctAnswer, examType, examYear, subject } = body;

    const newQuestion = new Question({
      questionText,
      options,
      correctAnswer,
      examType,
      examYear,
      subject
    });

    const savedQuestion = await newQuestion.save();
    res.status(201).json(savedQuestion);

  } catch (err) {
    // If using insertMany, this might return a validation error for specific items
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get questions with dynamic filtering
// @route   GET /api/questions?examType=WAEC&year=2020&subject=Maths
exports.getQuestions = async (req, res) => {
  try {
    // 1. Extract query parameters from the URL
    const { examType, examYear, subject } = req.query;

    // 2. Build a dynamic query object
    let query = {};

    if (examType) query.examType = examType;
    if (examYear) query.examYear = examYear;
    if (subject) query.subject = subject;

    // 3. Find items matching the query
    const questions = await Question.find(query);

    res.status(200).json({
      count: questions.length,
      data: questions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllSubjectsAndYears = async (req, res) => {
  try {
    const data = await Question.aggregate([
      {
        $group: {
          // KEY CHANGE: Group by Subject AND Exam Type together
          _id: { subject: "$subject", examType: "$examType" }, 
          years: { $addToSet: "$examYear" }
        }
      },
      {
        $project: {
          _id: 0, 
          // Flatten the structure for easier frontend use
          subject: "$_id.subject", 
          examType: "$_id.examType",
          years: 1
        }
      },
      { $sort: { subject: 1 } }
    ]);

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.getAllSubjectsAndYears = async (req, res) => {
//   try {
//     const data = await Question.aggregate([
//       {
//         $group: {
//           _id: "$subject",
//           // Change $first to $addToSet so you get ALL exam types for this subject
//           examType: { $addToSet: "$examType" }, 
//           years: { $addToSet: "$examYear" }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);

//     res.status(200).json(data);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };