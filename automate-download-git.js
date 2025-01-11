//Version 1.0 Stable with Bug Fixes. More features to come...
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Helper function for delays
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Main function
(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-software-rasterizer',
            '--disable-infobars',
            '--disable-notifications',
            '--disable-extensions',
            '--disable-dialogs',
        ]
    });
    const page = await browser.newPage();

    try {
        const cookiesPath = path.resolve(__dirname, 'cookies.json');
        const downloadPath = path.resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads');
        fs.mkdirSync(downloadPath, { recursive: true });

        // Define selectors
        const actionMenuSelector = 'button[aria-label="Action menu"]';
        const downloadLinkSelector = 'a[aria-label^="Download file"]';
        const activeLessonSelector = '.Outline_active__18Nx9'; // Selector for the active lesson

        // Load cookies if saved
        if (fs.existsSync(cookiesPath)) {
            const cookies = JSON.parse(fs.readFileSync(cookiesPath));
            await page.setCookie(...cookies);
            console.log('Cookies loaded successfully!');
        } else {
            await page.goto('https://myarkview.org/sign_in');
            await page.type('#email', 'kazimuhammadali11@gmail.com');
            await page.click('#otp-login-btn');
            console.log('Please enter OTP manually...');
            await page.waitForNavigation({ waitUntil: 'networkidle0' });

            const cookies = await page.cookies();
            fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
            console.log('Cookies saved successfully!');
        }

        // Start at the first lesson
        console.log('Navigating to the first lesson...');
        await page.goto('https://myarkview.org/admin-app/courses/317234/curriculum/lessons/4873163', {
            waitUntil: 'networkidle0',
        });
        console.log('First lesson loaded.');
        await delay(5000); // Additional delay to observe the first page load

        // Function to handle navigation and download
        const navigateAndDownload = async () => {
            const lessons = await page.$$('a.Outline_outlineLink__1xmZY'); // Ensure we're fetching all lesson links correctly

            if (lessons.length === 0) {
                console.error('No lesson links found!');
                return false;
            }

            for (const lesson of lessons) {
                // Only process the next lesson if it's not already processed
                const lessonText = await page.evaluate(el => el.textContent.trim(), lesson);
                console.log(`Checking lesson: "${lessonText}"`);

                // Click the lesson link
                await lesson.click();
                await delay(5000); // A small delay to ensure page has time to load

                try {
                    // Wait for the action menu on the new lesson page
                    await page.waitForSelector(actionMenuSelector, { timeout: 10000 });
                    console.log('Lesson page loaded successfully.');

                    const actionMenuButtons = await page.$$(actionMenuSelector);
                    if (actionMenuButtons.length >= 2) {
                        console.log('Clicking the second Action menu button...');
                        await actionMenuButtons[1].click();
                        await delay(2000); // Allow menu to open

                        // Wait for and click the download link
                        const downloadLink = await page.$(downloadLinkSelector);
                        if (downloadLink) {
                            console.log('Clicking download link...');
                            await downloadLink.click();
                            console.log('Download initiated.');
                            await delay(40000); // Ensure the file has time to download
                        } else {
                            console.error('Download link not found for lesson.');
                        }
                    } else {
                        console.error('Not enough Action menu buttons found.');
                    }
                } catch (error) {
                    console.error('Error while processing the lesson:', error.message);
                }
            }

            return true; // Continue to the next lesson
        };

        // Main loop to navigate and download all lessons
        while (true) {
            const shouldContinue = await navigateAndDownload();
            if (!shouldContinue) break;
        }

    } catch (error) {
        console.error('An error occurred:', error.message);
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
})();