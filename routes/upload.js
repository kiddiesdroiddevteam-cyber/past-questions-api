// // const express = require('express');
// // const router = express.Router();
// // const multer = require('multer');
// // const pdf = require('pdf-parse');

// // const upload = multer({ storage: multer.memoryStorage() });

// // router.post('/parse-pdf', upload.single('file'), async (req, res) => {
// //   try {
// //     const { examType, subject, examYear } = req.body;

// //     if (!examType || !subject || !examYear) {
// //       return res.status(400).json({
// //         error: 'Exam type, subject and exam year are required'
// //       });
// //     }

// //     if (!req.file) {
// //       return res.status(400).json({ error: 'PDF file is required' });
// //     }

// //     // Parse PDF
// //     const data = await pdf(req.file.buffer);
// //     const text = data.text;

// //     // Clean text
// //     const cleanedText = text.replace(/\r/g, '');

// // const questionBlocks = cleanedText
// //   .split(/(?=^\d+\.\s)/gm)
// //   .map(q => q.trim())
// //   .filter(q => /^\d+\./.test(q));

// //     // Extract structured questions
// //  const questions = questionBlocks.map((block, index) => {

// //   // Extract options
// //   const optionMatches = block.match(/[A-E]\.\s.*?(?=\n[A-E]\.|$)/gs);

// //   let options = [];

// //   if (optionMatches) {
// //     options = optionMatches.map(opt =>
// //       opt.replace(/[A-E]\.\s/, '').trim()
// //     );
// //   }

// //   // Remove options from question text
// //   let questionText = block;

// //   if (optionMatches) {
// //     optionMatches.forEach(opt => {
// //       questionText = questionText.replace(opt, '');
// //     });
// //   }

// //   // Remove the "1." number from question
// //   questionText = questionText.replace(/^\d+\.\s*/, '').trim();

// //   return {
// //     examType,
// //     subject,
// //     examYear,
// //     questionNumber: index + 1,
// //     questionText,
// //     options
// //   };
// // });

// //     // ✅ SEND RESPONSE ONCE
// //     res.json({
// //       success: true,
// //       totalQuestions: questions.length,
// //       questions
// //     });

// //   } catch (error) {
// //     console.error("PARSING ERROR:", error);
// //     res.status(500).json({ error: "Failed to process PDF: " + error.message });
// //   }
// // });

// // module.exports = router;

// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const pdf = require('pdf-parse');

// const upload = multer({ storage: multer.memoryStorage() });

// router.post('/parse-pdf', upload.single('file'), async (req, res) => {
//   try {
//     const { examType, subject, examYear } = req.body;

//     if (!examType || !subject || !examYear) {
//       return res.status(400).json({
//         error: 'Exam type, subject and exam year are required'
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({ error: 'PDF file is required' });
//     }

//     // 1. Parse PDF to raw text
//     const data = await pdf(req.file.buffer);
//     const text = data.text;

//     // 2. Clean text and normalize line breaks
//     // We replace carriage returns and simplify the dashed lines often found in PDFs
//     const cleanedText = text.replace(/\r/g, '').replace(/-{3,}/g, '');

//     // 3. Split by question numbers (e.g., "1. ", "2. ")
//     const questionBlocks = cleanedText
//       .split(/(?=^\d+\.\s)/gm)
//       .map(q => q.trim())
//       .filter(q => /^\d+\./.test(q));

//     // 4. Map blocks into structured objects
//     const questions = questionBlocks.map((block, index) => {
      
//       /**
//        * IMPROVED OPTION REGEX:
//        * Matches "A. " followed by text, stopping before the next " B. " or end of string.
//        * The 'g' flag finds all occurrences on the same line.
//        */
//       const optionMatches = block.match(/[A-E]\.\s+.*?(?=\s+[A-E]\.\s+|$)/g);

//       let options = [];
//       let questionText = block;

//       if (optionMatches) {
//         // Extract just the text, removing the "A. ", "B. ", etc.
//         options = optionMatches.map(opt => 
//           opt.replace(/^[A-E]\.\s+/, '').trim()
//         );

//         // Remove the detected options from the main block to isolate the question text
//         optionMatches.forEach(opt => {
//           questionText = questionText.replace(opt, '');
//         });
//       }

//       // 5. Final Question Text Cleanup
//       // Remove the leading number (e.g. "1. ") and any leftover whitespace
//       questionText = questionText
//         .replace(/^\d+\.\s*/, '')
//         .replace(/\s+/g, ' ') // Collapse multiple spaces/newlines into one
//         .trim();

//       return {
//         examType,
//         subject,
//         examYear,
//         questionNumber: index + 1,
//         questionText,
//         options
//       };
//     });

//     // 6. Send Response
//     res.json({
//       success: true,
//       totalQuestions: questions.length,
//       questions
//     });

//   } catch (error) {
//     console.error("PARSING ERROR:", error);
//     res.status(500).json({ 
//       error: "Failed to process PDF: " + error.message 
//     });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdf = require('pdf-parse');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    const { examType, subject, examYear } = req.body;

    if (!examType || !subject || !examYear) {
      return res.status(400).json({ error: 'Exam type, subject and exam year are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const data = await pdf(req.file.buffer);
    const text = data.text;

    // 1. Clean the text: Normalize spaces and remove those dashed lines (----------)
    const cleanedText = text.replace(/\r/g, '').replace(/-{3,}/g, '\n');

    // 2. Split into question blocks based on "Number + Dot" (e.g., 1. , 2. )
    const questionBlocks = cleanedText
      .split(/(?=^\d+\.\s)/gm)
      .map(q => q.trim())
      .filter(q => /^\d+\./.test(q));

    const questions = questionBlocks.map((block, index) => {
      
      /**
       * 3. FIND THE FIRST OPTION START
       * We find the index where "A. " first appears. Everything before that 
       * is definitely the question. Everything after might be options.
       */
      const firstOptionIndex = block.search(/\s[A-E]\.\s|^[A-E]\.\s/);
      
      let questionPart = block;
      let optionsPart = "";

      if (firstOptionIndex !== -1) {
        questionPart = block.substring(0, firstOptionIndex);
        optionsPart = block.substring(firstOptionIndex);
      }

      /**
       * 4. EXTRACT INDIVIDUAL OPTIONS
       * This regex looks for [Letter][Dot][Space] and captures everything 
       * until it hits the next [Letter][Dot][Space] or the end.
       */
      const optionMatches = optionsPart.match(/[A-E]\.\s+.*?(?=\s+[A-E]\.\s+|$)/gs);

      let options = [];
      if (optionMatches) {
        options = optionMatches.map(opt => 
          opt.replace(/^[A-E]\.\s+/, '').trim()
        );
      }

      // 5. CLEAN THE QUESTION TEXT
      // Remove the leading number (e.g., "1.") and collapse extra newlines/spaces
      let questionText = questionPart
        .replace(/^\d+\.\s*/, '')
        .replace(/\n/g, ' ') 
        .replace(/\s+/g, ' ')
        .trim();

      return {
        examType,
        subject,
        examYear,
        questionNumber: index + 1,
        questionText,
        options
      };
    });

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