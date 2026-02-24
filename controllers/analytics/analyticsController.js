const supabase = require('../../supabase/supabaseClient');

exports.getTotalUsers = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' });
    //   .eq('email', 'chukwukareuben362@gmail.com');

    if (error) throw error;

    res.json({ totalUsers: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActiveUsers = async (req, res) => {
  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_quiz_date', twoMonthsAgo.toISOString());

    if (error) throw error;

    res.json({ activeUsers: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTotalPracticeTest = async (req, res) => {
  try {

    const { count, error } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact' });

    if (error) throw error;

    res.json({ totalPracticeTests: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPracticeTestsByMode = async (req, res) => {
  try {
    const { mode } = req.query;

    let query = supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true });

    if (mode) {
      query = query.eq('mode', mode);
    }

    const { count, error } = await query;

    if (error) throw error;

    res.json({ totalPracticeTests: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPracticeTestsByExam = async (req, res) => {
  try {
    const { exam } = req.query;

    let query = supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true });

    if (exam) {
      query = query.eq('exam', exam);
    }

    const { count, error } = await query;

    if (error) throw error;

    res.json({ total: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
