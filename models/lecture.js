let lectures = [];
module.exports = {
  add: (lectureData) => {
    const lecture = {
      id: lectures.length + 1,
      ...lectureData
    };
    lectures.push(lecture);
    return lecture;
  }
};