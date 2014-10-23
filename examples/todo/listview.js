define([
  'jquery',
  'underscore',
  'butterfly/view',
  'butterfly/listview/ListViewTemplateItem',
  'iscroll'
  ], function($, _, View, TplItem, IScroll){

  //desired options
  //itemTemplate supports:
  //1. inside jQuery/Zepto object, using expression {$('#id')}
  //2. global jQuery/Zepto object, using expression {window.$('#id')}
  //2. DOM object, using expression {document.querySelector('#id')}
  //3. literal selector '#id', using plan string
  var listviewOptions = ['collection', 'itemTemplate', 'itemClass', 'pageSize', 'iscroll'];

  return View.extend({
    events: {
      "click .loadmore": "onLoadMore",
      "click li": "onRowSelect"
    },

    //parse params from options or from el attributes
    initialize: function(options){

      View.prototype.initialize.apply(this, arguments);

      var opts = this.parseOptions(options, listviewOptions);

      _.extend(this, opts);

      //convert itemTemplate to itemClass
      if (this.itemTemplate) {

        //convert DOM object to text
        if (this.itemTemplate instanceof HTMLElement) {
          this.itemTemplate = this.itemTemplate.innerHTML;
        }
        //convert jQuery object to text
        else if (this.itemTemplate instanceof jQuery) {
          this.itemTemplate = this.itemTemplate.html();
        }
        //convert literal selector to text
        else if (typeof this.itemTemplate == 'string' && this.itemTemplate[0] == '#') {
          this.itemTemplate = $(this.itemTemplate).html();
        }

        //compile to underscore template
        if (typeof this.itemTemplate == 'string') {
          this.itemTemplate = _.template(this.itemTemplate);
        }

        //this.itemTemplate already compiled
        this.itemClass = TplItem.extend({template: this.itemTemplate});
      }


      if (this.iscroll == 'true') {
        this.IScroll = new IScroll(this.el, {
          probeType: 2,
          scrollX: false,
          scrollY: true,
          mouseWheel: true
        });
      }

      this.bindCollectionEvents(this.collection);
    },

    parseOptions: function(options, desiredOptions){

      var me = this;

      return _.chain(desiredOptions)

      //get attribute value, [name, value] array
      .map(function(option){
        return [option, me.el.getAttribute('data-' + option)];
      })
      //turn [[name, value], [name, value], ...] array to object
      .object()

      //override by options
      .defaults(_.pick(options, listviewOptions))

      //eval
      .map(function(value, key){
        return [key, me.evaluate(value)];
      })
      .object()

      //get final value
      .value();
    },

    //evaluate option value, either a string or an expression
    evaluate: function(opt){
      if (typeof opt == 'string' && opt.match(/\{.*\}/)) {

        opt = opt.replace(/^\{/, '').replace(/\}$/, '');
        var fn = new Function("obj", "with(obj){return " + opt + ";}");
        return fn(this);

      } else {
        return opt;
      }
    },

    bindCollectionEvents: function(collection){

      var me = this;

      this.listenTo(collection, 'add', function(model, collection, options){
        console.log('add');

        var item = new me.itemClass({data: model.toJSON()});
        me.addItem(item);

        me.refresh();
      });

      this.listenTo(collection, 'remove', function(model, collection, options){
        console.log('remove');
      });

      this.listenTo(collection, 'change', function(model, collection, options){
        console.log('change');
      });

      this.listenTo(collection, 'reset', function(collection, options){
        console.log('reset');

        _.each(collection.models, function(model){
          me.addItem(model);
        });
      });
    },

    //
    // ListView API
    //
    refresh: function(){
      if (this.IScroll){
        var me = this;
        setTimeout(function() {
          me.IScroll.refresh();
        }, 0);
      }
    },

    //
    // ListView Evnets
    //
    onLoadMore: function(event) {
      var loadmoreButton = event.currentTarget;

      this.trigger('loadmore', this, event);
    },

    //选择了某一行
    onRowSelect: function(event){
      var li = event.currentTarget;
      var liCollection = this.el.querySelector('ul').children;
      var index = _.indexOf(liCollection, li);
      var item = this.subviews[index];
      if (!this.editing) {
        this.trigger('itemSelect', this, item, index, event);
      } else {
        item.toggleSelect();
      }
    },

    addItem: function(item){

      //convert backbone model to object
      if (item instanceof Backbone.Model) item = item.toJSON();
      //convert object to Item
      if ($.isPlainObject(item))  item = new this.itemClass({data: item});

      this.subviews.push(item);
      this.el.querySelector("ul").appendChild(item.el);
    }
  });
});
