class Student {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.progress = {};
  }

  updateProgress(courseId, topic, score) {
    if (!this.progress[courseId]) {
      this.progress[courseId] = {};
    }
    this.progress[courseId][topic] = score;
  }

  getProgress(courseId) {
    return this.progress[courseId] || {};
  }
}

module.exports = Student;