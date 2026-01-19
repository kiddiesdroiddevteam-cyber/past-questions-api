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

exports.bulkUpdateQuestions = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Updates array is required" });
    }

    const operations = updates.map(({ _id, ...fields }) => {
      if (!_id) return null;

      return {
        updateOne: {
          filter: { _id },
          update: { $set: fields }
        }
      };
    }).filter(Boolean);

    const result = await Question.bulkWrite(operations, {
      ordered: false // continues even if one fails
    });

    res.status(200).json({
      message: "Bulk update completed",
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Delete multiple questions by ID
// @route   DELETE /api/questions/bulk
exports.bulkDeleteQuestions = async (req, res) => {
  try {
    const { ids } = req.body;

    // Validation
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: "ids must be a non-empty array"
      });
    }

    const result = await Question.deleteMany({
      _id: { $in: ids }
    });

    res.status(200).json({
      message: "Bulk delete completed",
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
