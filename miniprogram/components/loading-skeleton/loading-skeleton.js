Component({
  properties: {
    type: {
      type: String,
      value: 'list' // 'list', 'grid', 'detail'
    },
    count: {
      type: Number,
      value: 4
    }
  },
  data: {
    items: []
  },
  observers: {
    'count': function(cnt) {
      this.setData({ items: new Array(cnt).fill(0) });
    }
  }
})
