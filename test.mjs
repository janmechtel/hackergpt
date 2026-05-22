import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => console.log('  [browser]', msg.type(), msg.text()));

  // Listen for network requests/responses to the API
  page.on('response', async response => {
    if (response.url().includes('openrouter')) {
      console.log(`  [network] ${response.status()} ${response.url().substring(0, 60)}...`);
      if (!response.ok()) {
        try {
          const body = await response.text();
          console.log('  [network] Error body:', body.substring(0, 200));
        } catch(e) {}
      }
    }
  });

  await page.goto('http://localhost:8080/index.html?skip');
  console.log('✅ Page loaded, boot screen skipped');

  await page.waitForSelector('#user-input', { state: 'visible' });
  console.log('✅ Input field visible');

  await page.fill('#user-input', 'capital of france');
  console.log('✅ Typed "capital of france"');

  await page.click('#send-btn');
  console.log('✅ Clicked send button');

  console.log('⏳ Waiting for LLM response...');

  // Check periodically what's on the page
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(5000);
    
    const state = await page.evaluate(() => {
      const msgs = document.querySelectorAll('.message.assistant');
      const errors = document.querySelectorAll('.message.error');
      const assistantContent = msgs.length > 0 ? msgs[msgs.length - 1].querySelector('.msg-content')?.textContent : '';
      const errorContent = errors.length > 0 ? errors[errors.length - 1].textContent : '';
      return { 
        assistantCount: msgs.length, 
        errorCount: errors.length,
        assistantContent: assistantContent?.substring(0, 200) || '',
        errorContent: errorContent?.substring(0, 200) || '',
        allMessages: document.querySelectorAll('.message').length
      };
    });
    
    console.log(`  [${(i+1)*5}s] msgs:${state.allMessages} assistant:${state.assistantCount} errors:${state.errorCount}`);
    
    if (state.errorContent) {
      console.log('❌ Error:', state.errorContent);
      break;
    }
    
    if (state.assistantContent && state.assistantContent.length > 10) {
      // Check if streaming is done (no cursor)
      const hasCursor = await page.evaluate(() => document.querySelectorAll('.cursor-blink').length > 0);
      if (!hasCursor) {
        console.log('\n✅ Got LLM response:');
        console.log('─'.repeat(50));
        console.log(state.assistantContent);
        console.log('─'.repeat(50));
        break;
      } else {
        console.log('  ... still streaming:', state.assistantContent.substring(0, 80));
      }
    }
  }

  await browser.close();
  console.log('\n✅ Test complete!');
})();
