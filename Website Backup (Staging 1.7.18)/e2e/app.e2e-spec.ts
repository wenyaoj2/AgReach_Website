import { NewDemoPage } from './app.po';

describe('new-demo App', () => {
  let page: NewDemoPage;

  beforeEach(() => {
    page = new NewDemoPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!!');
  });
});
