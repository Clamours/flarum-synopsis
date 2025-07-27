import app from 'flarum/forum/app';

import addSummaryExcerpt from './addSummaryExcerpt';
import addUserPreference from './addUserPreference';
import observeImages from './IntersectionObserver';

app.initializers.add('ianm-synopsis', () => {
  addSummaryExcerpt();
  addUserPreference();
  observeImages();
});
