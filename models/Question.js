const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  // Use an array for options (e.g., A, B, C, D)
  options: [{
    type: String,
  }],
  correctAnswer: {
    type: String, // Can be the index (0-3) or the actual text
  },
  // Categorization Fields
  examType: {
    type: String, 
    index: true // Indexing makes searching faster
  },
  examYear: {
    type: Number,
    index: true
  },
  subject: {
    type: String,
    index: true
  },
  // Optional: Handle images if the question has diagrams
  imageUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Question', QuestionSchema);