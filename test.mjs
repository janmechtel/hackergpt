import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Serve from local file
  await page.goto('http://localhost:8080/index.html?skip');

  console.log('✅ Page loaded, boot screen skipped');

  // Wait for the input to be visible
  await page.waitForSelector('#user-input', { state: 'visible' });
  console.log('✅ Input field visible');

  // Type the question
  await page.fill('#user-input', 'capital of france');
  console.log('✅ Typed "capital of france"');

  // Click send
  await page.click('#send-btn');
  console.log('✅ Clicked send button');

  // Wait for assistant response - look for .message.assistant .msg-content that has text
  // The streaming response will populate .msg-content, wait until it has substantial content
  console.log('⏳ Waiting for LLM response...');

  await page.waitForFunction(() => {
    const msgs = document.querySelectorAll('.message.assistant .msg-content');
    if (msgs.length === 0) return false;
    const lastMsg = msgs[msgs.length - 1];
    // Wait until there's real content (not empty, not just cursor)
    const text = lastMsg.textContent.trim();
    return text.length > 10;
  }, { timeout: 60000 });

  // Wait a bit more for streaming to finish (no more cursor-blink element)
  await page.waitForFunction(() => {
    const cursors = document.querySelectorAll('.cursor-blink');
    return cursors.length === 0;
  }, { timeout: 60000 });

  // Get the response
  const response = await page.evaluate(() => {
    const msgs = document.querySelectorAll('.message.assistant .msg-content');
    return msgs[msgs.length - 1].textContent.trim();
  });

  console.log('\n✅ Got LLM response:');
  console.log('─'.repeat(50));
  console.log(response);
  console.log('─'.repeat(50));

  // Check for errors
  const errors = await page.$$('.message.error');
  if (errors.length > 0) {
    const errorText = await page.evaluate(el => el.textContent, errors[0]);
    console.log('❌ Error detected:', errorText);
  }

  await browser.close();
  console.log('\n✅ Test complete!');
})();
