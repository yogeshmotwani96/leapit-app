import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  console.log('Navigating...');
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const login = btns.find(b => b.textContent && b.textContent.includes('Log in instead'));
    if (login) login.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.type('input[type="email"]', 'yogeshmotwani96@gmail.com');
  await page.type('input[type="password"]', 'Yogi1713!');

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submit = btns.find(b => b.textContent && b.textContent.includes('Sign In'));
    if (submit) submit.click();
  });

  console.log('Clicked submit. Waiting 3 seconds...');
  await new Promise(r => setTimeout(r, 3000));
  
  await page.screenshot({ path: 'C:\\Users\\yoges\\.gemini\\antigravity\\brain\\2e2058dc-370f-4339-86f8-b42e814e9870\\scratch\\test-auth.png' });
  console.log('Screenshot saved to scratch dir.');
  
  await browser.close();
})();
