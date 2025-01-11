const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Custom download path
const customDownloadPath = path.resolve(__dirname, 'downloads');
fs.mkdirSync(customDownloadPath, { recursive: true }); // Ensure the directory exists

// Path to the progress file
const progressFilePath = path.resolve(__dirname, 'progress.json');

// Helper function for delays
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to rename downloaded file
const renameDownloadedFile = async (lessonTitle) => {
    console.log('Renaming downloaded file...');
    try {
        const files = fs.readdirSync(customDownloadPath);
        const mostRecentFile = files
            .map(file => ({ file, time: fs.statSync(path.join(customDownloadPath, file)).mtime }))
            .sort((a, b) => b.time - a.time)[0]; // Find the latest file

        if (!mostRecentFile) {
            console.error('No file found in the download directory.');
            return;
        }

        const oldFilePath = path.join(customDownloadPath, mostRecentFile.file);
        const sanitizedTitle = lessonTitle.replace(/[^a-zA-Z0-9_\-\(\)]/g, '_'); // Retain parentheses
        const newFilePath = path.join(customDownloadPath, `${sanitizedTitle}.mp4`);

        fs.renameSync(oldFilePath, newFilePath);
        console.log(`File renamed to: ${newFilePath}`);
    } catch (error) {
        console.error('Error renaming file:', error.message);
    }
};

// Load progress file
const loadProgressFile = () => {
    if (fs.existsSync(progressFilePath)) {
        return JSON.parse(fs.readFileSync(progressFilePath));
    } else {
        return [];
    }
};

// Save progress to file
const saveProgressFile = (progress) => {
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
};

// Puppeteer setup
(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();

    // Configure download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: customDownloadPath
    });

    try {
        const cookiesPath = path.resolve(__dirname, 'cookies.json');
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

        // Navigate to the course page
        console.log('Navigating to the course page...');
        await page.goto('https://myarkview.org/admin-app/courses/317234/curriculum/lessons/4873163', {
            waitUntil: 'networkidle0',
        });

        console.log('Loading the list of lessons...');
        const lessonLinkSelector = 'a.Outline_outlineLink__1xmZY';
        const lessons = await page.$$(lessonLinkSelector);
        console.log(`Found ${lessons.length} lessons in the list.`);

        const lessonTitles = await Promise.all(
            lessons.map(lesson => page.evaluate(el => el.textContent.trim(), lesson))
        );

        // Load progress and find missing lessons
        const progress = loadProgressFile();
        const missingLessons = lessonTitles.filter(title => !progress.includes(title));
        console.log(`Missing lessons: ${missingLessons.join(', ')}`);

        // Process missing lessons
        for (const lessonTitle of missingLessons) {
            const index = lessonTitles.indexOf(lessonTitle);
            if (index === -1) {
                console.error(`Lesson "${lessonTitle}" not found in the list.`);
                continue;
            }

            console.log(`Navigating to lesson: "${lessonTitle}"`);
            await lessons[index].click();
            await delay(5000); // Wait for lesson to load

            console.log('Downloading lesson...');
            await downloadLesson(lessonTitle);

            // Add lesson to progress
            progress.push(lessonTitle);
            saveProgressFile(progress);
        }
    } catch (error) {
        console.error('An error occurred:', error.message);
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }

    // Function to handle downloading
    async function downloadLesson(lessonTitle) {
        const actionMenuSelector = 'button[aria-label="Action menu"]';
        const downloadLinkSelector = 'a[aria-label^="Download file"]';

        try {
            console.log('Waiting for the action menu to load...');
            await page.waitForSelector(actionMenuSelector, { timeout: 10000 });

            const actionMenuButtons = await page.$$(actionMenuSelector);
            if (actionMenuButtons.length >= 2) {
                console.log('Clicking the second Action menu button...');
                await actionMenuButtons[1].click();
                await delay(1000); // Small delay to allow menu options to render

                console.log('Waiting for the download link...');
                await page.waitForSelector(downloadLinkSelector, { timeout: 5000 });
                const downloadLink = await page.$(downloadLinkSelector);

                if (downloadLink) {
                    console.log('Clicking the download link...');
                    await downloadLink.click();
                    console.log('Download initiated.');

                    // Wait for download and rename
                    await delay(60000); // Wait for download to complete
                    await renameDownloadedFile(lessonTitle);
                } else {
                    console.error('Download link not found.');
                }
            } else {
                console.error('Not enough Action menu buttons found.');
            }
        } catch (error) {
            console.error('Error during download process:', error.message);
        }
    }
})();
