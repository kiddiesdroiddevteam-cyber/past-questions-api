const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  // Use an array for options (e.g., A, B, C, D)
  options: [{
    type: String,
    required: true
  }],
  correctAnswer: {
    type: String, // Can be the index (0-3) or the actual text
    required: true,
  },
  // Categorization Fields
  examType: {
    type: String, 
    required: true, 
    index: true // Indexing makes searching faster
  },
  examYear: {
    type: Number,
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    index: true
  },
  // Optional: Handle images if the question has diagrams
  imageUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Question', QuestionSchema);