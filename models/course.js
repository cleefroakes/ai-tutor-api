module.exports = {
  getById: (id) => {
    const courses = [
      { id: 1, name: 'Math', topics: ['algebra', 'calculus'] },
      { id: 2, name: 'Science', topics: ['physics', 'chemistry'] },
      { id: 3, name: 'History', topics: ['world war', 'renaissance'] }
    ];
    return courses.find(course => course.id === id);
  }
};