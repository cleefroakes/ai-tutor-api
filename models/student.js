module.exports = {
  getStudents: () => {
    return [
      { id: 1, name: 'John Doe', enrolledCourses: [1, 2] },
      { id: 2, name: 'Jane Smith', enrolledCourses: [2, 3] }
    ];
  },
  getById: (id) => {
    const students = [
      { id: 1, name: 'John Doe', enrolledCourses: [1, 2] },
      { id: 2, name: 'Jane Smith', enrolledCourses: [2, 3] }
    ];
    return students.find(student => student.id === id);
  }
};