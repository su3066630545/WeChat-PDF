const queue = require("../../utils/task-queue");

Page({
  data: {
    tasks: []
  },

  onLoad() {
    this.unsubscribe = queue.subscribe((tasks) => {
      this.setData({ tasks });
    });
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe();
  }
});
