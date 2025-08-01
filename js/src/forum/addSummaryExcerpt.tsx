import { extend } from 'flarum/common/extend';
import app from 'flarum/forum/app';
import DiscussionListState from 'flarum/forum/states/DiscussionListState';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';
import { truncate } from 'flarum/common/utils/string';
import ItemList from 'flarum/common/utils/ItemList';
import Tag from 'flarum/tags/models/Tag';
import Model from 'flarum/common/Model';
import { getPlainContent } from './util/getPlainContent';

import cheerio from 'cheerio';


export default function addSummaryExcerpt() {
  if (app.initializers.has('flarum-tags')) {
    Tag.prototype.richExcerpts = Model.attribute('richExcerpts');
    Tag.prototype.excerptLength = Model.attribute('excerptLength');
  }

  extend(DiscussionListState.prototype, 'requestParams', function (params: any) {
    if (app.forum.attribute('synopsis.excerpt_type') === 'first') params.include.push('firstPost');
    else params.include.push('lastPost');
  });

  extend(DiscussionListItem.prototype, 'infoItems', function (items: ItemList) {
    const discussion = this.attrs.discussion;

    if (app.session.user && !app.session.user.preferences().showSynopsisExcerpts) {
      return;
    }

    // 搜索时不再应用本插件提供的预览功能，因为这样会让搜索结果原本的预览被覆盖
    // 搜索结果原本的预览会把关键词所在段落涵盖进去，但本插件总是只显示帖子开头/结尾的设定字符数
    if(app.discussions.params?.q !== undefined){
      return;
    }


      const tags = discussion.tags();
    let tag;
    if (tags) {
      tag = tags[tags.length - 1];
    }

    const excerptPost = app.forum.attribute('synopsis.excerpt_type') === 'first' ? discussion.firstPost() : discussion.lastPost();
    const excerptLength = typeof tag?.excerptLength() === 'number' ? tag?.excerptLength() : app.forum.attribute('synopsis.excerpt_length');
    const richExcerpt = typeof tag?.richExcerpts() === 'number' ? tag?.richExcerpts() : app.forum.attribute('synopsis.rich_excerpts');
    // const onMobile = app.session.user ? app.session.user.preferences().showSynopsisExcerptsOnMobile : false;

    // A length of zero means we don't want a synopsis for this discussion, so do nothing.
    if (excerptLength === 0) {
      return;
    }

    if (!excerptPost?.contentHtml?.()) return;


    /*
        原实现: 将一楼post内容对应的html字符串按设定长度截断，然后将html字符串 m.trust 转化为html
        新实现: 提取一楼post中的文本内容，按设定长度截断；再提取post中的img或视频外链内容(按数量上限)，
               再经 m.trust 转化为html。
    */

    // 纯文本内容按设定长度截断
    const contentText = truncate(excerptPost.contentPlain(), excerptLength);

    // 展示的数量上限
    const maxResources = 3;


    // 富文本提取支持(目前)：图片
    function getResource(html:string, maxResources:number){
      // 根据展示数量上限，计算单图最大宽度(百分比)
      const maxWidth =  (100 - 2*maxResources) / maxResources;
    
      // 使用cheerio操作html字符串(一楼post内容)
      const $ = cheerio.load(html,null, false);
      const images = $('img');  // 选择器:img标签
    
      var ret = '';
    
      // 不含img标签
      if(images.length === 0){
          return ret;
      }
      // 含img标签
      else{
        for(let i = 0; i < images.length && i < maxResources; i++){
          // 从localStorage中获取图片的高度
          let height = localStorage.getItem(images[i].attribs.src);
          if (!height) {
              // 如果在localStorage中没有找到图片的高度，那么设置高度为'auto'
              height = 'auto';
          }
      
          // 将图片及其高度信息添加到生成的HTML代码中，并设置懒加载属性
          ret += (`<li class="ianm-syno-imgs" style="max-width: ${maxWidth}%; height: ${height}px;">
          <img src="${images[i].attribs.src}" style="height: ${height}px;" loading="lazy" onload="if (this.complete) { this.style.height=this.offsetHeight+'px'; localStorage.setItem('${images[i].attribs.src}', this.offsetHeight); }">` +'</li>');
      }
      }
    
      // 将字符串解析为html
      return m.trust(ret);
    }
    
    
    

    // console.log(this);
    // console.log(discussion);
    // console.log(excerptPost);
    // console.log(excerptPost.contentHtml());

    // 非文本资源
    const contentResource = richExcerpt ?  getResource(excerptPost.contentHtml(), maxResources) : '';

    // 原插件的核心实现
    // const content = richExcerpt ? m.trust(truncate(excerptPost.contentHtml(), excerptLength)) : truncate(excerptPost.contentPlain(), excerptLength);

    if (excerptPost) {
      let excerpt;
      if (contentResource !== '') {
           excerpt =
              <div class="ianm-synopsis-excerpt">
                  <div class="ianm-synopsis-text">
                      {contentText}
                  </div>
                  <div class="ianm-synopsis-resource">
                      <ul class="ianm-synopsis-gallary">
                          {contentResource}
                      </ul>
                  </div>
              </div>;
      }else{
           excerpt =
              <div class="ianm-synopsis-excerpt">
                  <div class="ianm-synopsis-text">
                      {contentText}
                  </div>
              </div>;
      }

      // items.add(onMobile ? 'excerptM' : 'excerpt', excerpt, -100);
      items.add('excerpt', excerpt, -100);
    }

  });
}
