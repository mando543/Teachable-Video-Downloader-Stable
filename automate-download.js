//Stable Version 1.0 Bug fix
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
            await page.type('#email', 'your-email@example.com');
            await page.click('#otp-login-btn');
            console.log('Please enter OTP manually...');
            await page.waitForNavigation({ waitUntil: 'networkidle0' });

            const cookies = await page.cookies();
            fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
            console.log('Cookies saved successfully!');
        }

        // Start at the first lesson
        console.log('Navigating to the first lesson...');
        await page.goto('https://myarkview.org/admin-app/courses/312551/curriculum/lessons/4912681', {
            waitUntil: 'networkidle0',
        });
        console.log('First lesson loaded.');
        await delay(5000); // Additional delay to observe the first page load

        // Function to find the next lesson
        const findNextLesson = async () => {
            console.log('Locating the next lesson...');
            const activeLessonElement = await page.$(activeLessonSelector);
            if (!activeLessonElement) {
                console.error('Active lesson not found!');
                return null;
            }

            // Extract all numbers from the active lesson name and take the last one
            const activeLessonText = await page.evaluate(el => el.textContent.trim(), activeLessonElement);
            console.log(`Active lesson text: "${activeLessonText}"`);
            const lessonNumbers = activeLessonText.match(/#(\d+)/g);
            if (!lessonNumbers || lessonNumbers.length === 0) {
                console.error('No lesson numbers found in the active lesson name!');
                return null;
            }
            const lastLessonNumber = parseInt(lessonNumbers[lessonNumbers.length - 1].replace('#', ''), 10);
            console.log(`Current active lesson number (last in title): #${lastLessonNumber}`);

            // Find the next lesson
            const lessons = await page.$$('a.Outline_outlineLink__1xmZY');
            for (const lesson of lessons) {
                const lessonText = await page.evaluate(el => el.textContent.trim(), lesson);
                console.log(`Examining lesson: "${lessonText}"`);
                const lessonNumbers = lessonText.match(/#(\d+)/g);
                if (lessonNumbers) {
                    const firstNumberInLesson = parseInt(lessonNumbers[0].replace('#', ''), 10);
                    if (firstNumberInLesson === lastLessonNumber + 1) {
                        console.log(`Found the next lesson starting with: #${firstNumberInLesson}`);
                        return lesson; // Return the next lesson link
                    }
                }
            }

            console.error(`No lesson found starting with #${lastLessonNumber + 1}.`);
            return null;
        };

        // Function to handle navigation and download
        const navigateAndDownload = async () => {
            const nextLesson = await findNextLesson();
            if (!nextLesson) return false;

            console.log('Clicking the next lesson link...');
            await nextLesson.click();
            await delay(5000); // Additional delay after clicking the next lesson

            console.log('Waiting for the next lesson page to load...');
            try {
                await page.waitForSelector(actionMenuSelector, { timeout: 10000 });
                console.log('Next lesson page loaded.');
                await delay(5000); // Additional delay to observe the loaded page
            } catch (error) {
                console.error('Error while waiting for page load:', error.message);
                return false;
            }

            console.log('Next lesson page loaded. Preparing to download...');
            try {
                await page.waitForSelector(actionMenuSelector, { timeout: 10000 });
                const actionMenuButtons = await page.$$(actionMenuSelector);
                console.log(`Found ${actionMenuButtons.length} action menu buttons.`);

                if (actionMenuButtons.length >= 2) {
                    console.log('Clicking the second Action menu button...');
                    await actionMenuButtons[1].click();
                    await delay(3000); // Small delay to allow menu options to render

                    console.log('Waiting for the download link...');
                    await page.waitForSelector(downloadLinkSelector, { timeout: 10000 });
                    const downloadLink = await page.$(downloadLinkSelector);

                    if (downloadLink) {
                        console.log('Clicking the download link...');
                        await downloadLink.click();
                        console.log('Download initiated.');
                        await delay(40000); // Ensure sufficient time for the download
                    } else {
                        console.error('Download link not found.');
                    }
                } else {
                    console.error('Not enough Action menu buttons found.');
                }
            } catch (error) {
                console.error('Error during download process:', error.message);
            }
            return true;
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



//This Version correctly downloads and renames files according to active lesson, untested on Windows and broken on Macintosh
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');

// // Helper function for delays
// const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// // Main function
// (async () => {
//     const browser = await puppeteer.launch({
//         headless: false,
//         args: [
//             '--no-sandbox',
//             '--disable-software-rasterizer',
//             '--disable-infobars',
//             '--disable-notifications',
//             '--disable-extensions',
//             '--disable-dialogs',
//         ]
//     });
//     const page = await browser.newPage();

//     try {
//         const cookiesPath = path.resolve(__dirname, 'cookies.json');
//         const downloadPath = path.resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads');
//         fs.mkdirSync(downloadPath, { recursive: true });

//         // Load cookies if saved
//         if (fs.existsSync(cookiesPath)) {
//             const cookies = JSON.parse(fs.readFileSync(cookiesPath));
//             await page.setCookie(...cookies);
//             console.log('Cookies loaded successfully!');
//         } else {
//             await page.goto('https://myarkview.org/sign_in');
//             await page.type('#email', 'your-email@example.com'); //Change your-email@example.com to your myarkview.org email address
//             await page.click('#otp-login-btn');
//             console.log('Please enter OTP manually...');
//             await page.waitForNavigation({ waitUntil: 'networkidle0' });

//             const cookies = await page.cookies();
//             fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
//             console.log('Cookies saved successfully!');
//         }

//         // Start at the first lesson
//         console.log('Navigating to the first lesson...');
//         await page.goto('https://myarkview.org/admin-app/courses/312551/curriculum/lessons/4889696', { //Change the link according to the course and lesson used
//             waitUntil: 'networkidle0',
//         });
//         console.log('First lesson loaded.');

//         const actionMenuSelector = 'button[aria-label="Action menu"]';
//         const downloadLinkSelector = 'a[aria-label^="Download file"]';

//         // Wait for Action menu to load (increase timeout for first lesson)
//         await page.waitForSelector(actionMenuSelector, { timeout: 20000 });
//         const actionMenuButtons = await page.$$(actionMenuSelector);
//         console.log(`Found ${actionMenuButtons.length} action menu buttons.`);

//         if (actionMenuButtons.length >= 2) {
//             console.log('Clicking the second Action menu button...');
//             await actionMenuButtons[1].click();
//             await delay(2000); // Small delay to allow menu options to render

//             console.log('Waiting for the download link...');
//             await page.waitForSelector(downloadLinkSelector, { timeout: 20000 }); // Increased timeout
//             const downloadLink = await page.$(downloadLinkSelector);

//             if (downloadLink) {
//                 console.log('Clicking the download link...');
//                 await downloadLink.click();
//                 console.log('Download initiated.');
//                 await delay(30000); // Ensure sufficient time for the download
//             } else {
//                 console.error('Download link not found.');
//             }
//         } else {
//             console.error('Not enough Action menu buttons found.');
//         }

//         // Active lesson selector for renaming
//         const activeLessonSelector = '.Outline_active__18Nx9'; // Adjust if necessary

//         // Function to get the active lesson number from the active lesson selector
//         const getActiveLessonNumber = async () => {
//             const activeLessonElement = await page.$(activeLessonSelector);
//             if (!activeLessonElement) {
//                 console.error('Active lesson not found!');
//                 return null;
//             }

//             // Extract the active lesson number (e.g., #36)
//             const activeLessonText = await page.evaluate(el => el.textContent.trim(), activeLessonElement);
//             const activeLessonNumberMatch = activeLessonText.match(/#(\d+)/);
//             if (!activeLessonNumberMatch) {
//                 console.error('Active lesson number not found!');
//                 return null;
//             }

//             const activeLessonNumber = parseInt(activeLessonNumberMatch[1], 10);
//             return activeLessonNumber;
//         };

//         // Function to get the next lesson link in the list based on the active lesson number
//         const getNextLessonLink = async (activeLessonNumber) => {
//             const lessonLinks = await page.$$('a.Outline_outlineLink__1xmZY'); // Adjust selector for lesson links
//             let nextLesson = null;

//             for (const lessonLink of lessonLinks) {
//                 const lessonText = await page.evaluate(el => el.textContent.trim(), lessonLink);
//                 const lessonNumberMatch = lessonText.match(/#(\d+)/);
//                 if (lessonNumberMatch) {
//                     const lessonNumber = parseInt(lessonNumberMatch[1], 10);
//                     // Find the next lesson after the current active lesson
//                     if (lessonNumber === activeLessonNumber + 1) {
//                         nextLesson = lessonLink;
//                         break;
//                     }
//                 }
//             }

//             return nextLesson;
//         };

//         // Function to rename the downloaded file
//         const renameDownloadFile = (activeLessonTitle) => {
//             const downloadFiles = fs.readdirSync(downloadPath);
//             for (const file of downloadFiles) {
//                 if (file.endsWith('.pdf')) { // Assuming the downloaded file is a PDF
//                     const oldFilePath = path.join(downloadPath, file);
//                     const newFilePath = path.join(downloadPath, `${activeLessonTitle}.pdf`);
//                     fs.renameSync(oldFilePath, newFilePath);
//                     console.log(`File renamed to: ${activeLessonTitle}.pdf`);
//                     break;
//                 }
//             }
//         };

//         // Main loop to navigate and download all lessons
//         while (true) {
//             const activeLessonNumber = await getActiveLessonNumber();
//             if (!activeLessonNumber) {
//                 console.log('No active lesson found.');
//                 break;
//             }

//             console.log(`Active Lesson: #${activeLessonNumber}`);
//             await renameDownloadFile(`#${activeLessonNumber}`); // Rename the file after download

//             // Find the next lesson based on the active lesson number
//             const nextLesson = await getNextLessonLink(activeLessonNumber);
//             if (nextLesson) {
//                 console.log('Clicking the next lesson...');
//                 await nextLesson.click();
//                 await delay(5000); // Wait for the next lesson page to load
//             } else {
//                 console.log('No more lessons found.');
//                 break;
//             }
//         }

//     } catch (error) {
//         console.error('An error occurred:', error.message);
//     } finally {
//         console.log('Closing browser...');
//         await browser.close();
//     }
// })();




//This Version is an attempt at renaming files to lesson name for Mac, does not work on Macintosh
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');
// const { exec } = require('child_process');

// // Helper function for delays
// const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// // Function to rename using 'mv' with sudo permissions
// const renameFileWithSudo = (oldPath, newPath) => {
//     return new Promise((resolve, reject) => {
//         const command = `sudo mv "${oldPath}" "${newPath}"`;
//         exec(command, (error, stdout, stderr) => {
//             if (error) {
//                 reject(`Error renaming file: ${stderr}`);
//             } else {
//                 resolve(`File renamed to: ${newPath}`);
//             }
//         });
//     });
// };

// // Main function
// (async () => {
//     const browser = await puppeteer.launch({
//         headless: false,
//         args: [
//             '--no-sandbox',
//             '--disable-software-rasterizer',
//             '--disable-infobars',
//             '--disable-notifications',
//             '--disable-extensions',
//             '--disable-dialogs',
//         ]
//     });
//     const page = await browser.newPage();

//     try {
//         const cookiesPath = path.resolve(__dirname, 'cookies.json');
//         const downloadPath = path.resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads');
//         fs.mkdirSync(downloadPath, { recursive: true });

//         // Load cookies if saved
//         if (fs.existsSync(cookiesPath)) {
//             const cookies = JSON.parse(fs.readFileSync(cookiesPath));
//             await page.setCookie(...cookies);
//             console.log('Cookies loaded successfully!');
//         } else {
//             await page.goto('https://myarkview.org/sign_in');
//             await page.type('#email', 'your-email@example.com');
//             await page.click('#otp-login-btn');
//             console.log('Please enter OTP manually...');
//             await page.waitForNavigation({ waitUntil: 'networkidle0' });

//             const cookies = await page.cookies();
//             fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
//             console.log('Cookies saved successfully!');
//         }

//         // Start at the first lesson
//         console.log('Navigating to the first lesson...');
//         await page.goto('https://myarkview.org/admin-app/courses/312551/curriculum/lessons/4889696', {
//             waitUntil: 'networkidle0',
//         });
//         console.log('First lesson loaded.');

//         const actionMenuSelector = 'button[aria-label="Action menu"]';
//         const downloadLinkSelector = 'a[aria-label^="Download file"]';

//         // Wait for Action menu to load
//         await page.waitForSelector(actionMenuSelector, { timeout: 20000 });
//         const actionMenuButtons = await page.$$(actionMenuSelector);
//         console.log(`Found ${actionMenuButtons.length} action menu buttons.`);

//         if (actionMenuButtons.length >= 2) {
//             console.log('Clicking the second Action menu button...');
//             await actionMenuButtons[1].click();
//             await delay(2000); // Small delay to allow menu options to render

//             console.log('Waiting for the download link...');
//             await page.waitForSelector(downloadLinkSelector, { timeout: 20000 }); // Increased timeout
//             const downloadLink = await page.$(downloadLinkSelector);

//             if (downloadLink) {
//                 console.log('Clicking the download link...');
//                 await downloadLink.click();
//                 console.log('Download initiated.');
//                 await delay(30000); // Ensure sufficient time for the download
//             } else {
//                 console.error('Download link not found.');
//             }
//         } else {
//             console.error('Not enough Action menu buttons found.');
//         }

//         // Active lesson selector for renaming
//         const activeLessonSelector = '.Outline_active__18Nx9'; // Adjust if necessary

//         // Function to get the active lesson title
//         const getActiveLessonTitle = async () => {
//             const activeLessonElement = await page.$(activeLessonSelector);
//             if (!activeLessonElement) {
//                 console.error('Active lesson not found!');
//                 return null;
//             }

//             const activeLessonText = await page.evaluate(el => el.textContent.trim(), activeLessonElement);
//             return activeLessonText || null;
//         };

//         // Function to rename the downloaded file
//         const renameDownloadFile = async (activeLessonTitle) => {
//             const downloadFiles = fs.readdirSync(downloadPath);
//             for (const file of downloadFiles) {
//                 if (file.endsWith('.pdf')) { // Assuming the downloaded file is a PDF
//                     const oldFilePath = path.join(downloadPath, file);
//                     const newFilePath = path.join(downloadPath, `${activeLessonTitle}.pdf`);
//                     try {
//                         const result = await renameFileWithSudo(oldFilePath, newFilePath);
//                         console.log(result);  // Log success message
//                     } catch (error) {
//                         console.error(error);  // Log error if renaming fails
//                     }
//                     break;
//                 }
//             }
//         };

//         // Main loop to navigate and download all lessons
//         while (true) {
//             const activeLessonTitle = await getActiveLessonTitle();
//             if (!activeLessonTitle) break;

//             console.log(`Active Lesson: ${activeLessonTitle}`);
//             await renameDownloadFile(activeLessonTitle); // Rename the file after download

//             // Continue with navigation to next lesson...
//             const nextLessonButton = await page.$('button[aria-label="Next Lesson"]');
//             if (nextLessonButton) {
//                 await nextLessonButton.click();
//                 await delay(5000); // Wait for the next lesson to load
//             } else {
//                 console.log('No more lessons found.');
//                 break;
//             }
//         }
//     } catch (error) {
//         console.error('An error occurred:', error.message);
//     } finally {
//         console.log('Closing browser...');
//         await browser.close();
//     }
// })();





//Stable Teachable Video Downloader Version 1.0
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');

// // Helper function for delays
// const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// // Main function
// (async () => {
//     const browser = await puppeteer.launch({
//         headless: false,
//         args: [
//             '--no-sandbox',
//             '--disable-software-rasterizer',
//             '--disable-infobars',
//             '--disable-notifications',
//             '--disable-extensions',
//             '--disable-dialogs',
//         ]
//     });
//     const page = await browser.newPage();

//     try {
//         const cookiesPath = path.resolve(__dirname, 'cookies.json');
//         const downloadPath = path.resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads');
//         fs.mkdirSync(downloadPath, { recursive: true });

//         // Load cookies if saved
//         if (fs.existsSync(cookiesPath)) {
//             const cookies = JSON.parse(fs.readFileSync(cookiesPath));
//             await page.setCookie(...cookies);
//             console.log('Cookies loaded successfully!');
//         } else {
//             await page.goto('https://myarkview.org/sign_in');
//             await page.type('#email', 'your-email@example.com');
//             await page.click('#otp-login-btn');
//             console.log('Please enter OTP manually...');
//             await page.waitForNavigation({ waitUntil: 'networkidle0' });

//             const cookies = await page.cookies();
//             fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
//             console.log('Cookies saved successfully!');
//         }

//         // Start at the first lesson
//         console.log('Navigating to the first lesson...');
//         await page.goto('https://myarkview.org/admin-app/courses/312551/curriculum/lessons/4889689', {
//             waitUntil: 'networkidle0',
//         });
//         console.log('First lesson loaded.');

//         const actionMenuSelector = 'button[aria-label="Action menu"]';
//         const downloadLinkSelector = 'a[aria-label^="Download file"]';

//         // Wait for Action menu to load (increase timeout for first lesson)
//         await page.waitForSelector(actionMenuSelector, { timeout: 5000 });
//         const actionMenuButtons = await page.$$(actionMenuSelector);
//         console.log(`Found ${actionMenuButtons.length} action menu buttons.`);

//         if (actionMenuButtons.length >= 2) {
//             console.log('Clicking the second Action menu button...');
//             await actionMenuButtons[1].click();
//             await delay(2000); // Small delay to allow menu options to render

//             console.log('Waiting for the download link...');
//             await page.waitForSelector(downloadLinkSelector, { timeout: 5000 }); // Increased timeout
//             const downloadLink = await page.$(downloadLinkSelector);

//             if (downloadLink) {
//                 console.log('Clicking the download link...');
//                 await downloadLink.click();
//                 console.log('Download initiated.');
//                 await delay(20000); // Ensure sufficient time for the download
//             } else {
//                 console.error('Download link not found.');
//             }
//         } else {
//             console.error('Not enough Action menu buttons found.');
//         }

//         // Continue with navigation and downloading next lessons...
//         const activeLessonSelector = '.Outline_active__18Nx9'; // Adjust if necessary

//         // Function to find the next lesson
//         const findNextLesson = async () => {
//             console.log('Locating the next lesson...');
//             const activeLessonElement = await page.$(activeLessonSelector);
//             if (!activeLessonElement) {
//                 console.error('Active lesson not found!');
//                 return null;
//             }

//             // Extract the active lesson number from the active lesson element
//             const activeLessonText = await page.evaluate(el => el.textContent.trim(), activeLessonElement);
//             const activeLessonNumberMatch = activeLessonText.match(/#(\d+)/);
//             if (!activeLessonNumberMatch) {
//                 console.error('Active lesson number not found!');
//                 return null;
//             }
//             const activeLessonNumber = parseInt(activeLessonNumberMatch[1], 10);
//             console.log(`Current active lesson number: #${activeLessonNumber}`);

//             // Find the next lesson in the list
//             const lessons = await page.$$('a.Outline_outlineLink__1xmZY');
//             for (const lesson of lessons) {
//                 const lessonText = await page.evaluate(el => el.textContent.trim(), lesson);
//                 const nextLessonNumberMatch = lessonText.match(/#(\d+)/);
//                 if (nextLessonNumberMatch) {
//                     const nextLessonNumber = parseInt(nextLessonNumberMatch[1], 10);
//                     if (nextLessonNumber === activeLessonNumber + 1) {
//                         console.log(`Found the next lesson: #${nextLessonNumber}`);
//                         return lesson; // Return the next lesson link
//                     }
//                 }
//             }
//             console.error('No next lesson found.');
//             return null;
//         };

//         // Function to handle navigation and download
//         const navigateAndDownload = async () => {
//             const nextLesson = await findNextLesson();
//             if (!nextLesson) return false;

//             console.log('Clicking the next lesson link...');
//             await nextLesson.click();

//             console.log('Waiting for the next lesson page to load...');
//             // Wait for the Action menu button to appear, which indicates the page has loaded
//             try {
//                 await page.waitForSelector(actionMenuSelector, { timeout: 5000 });
//                 console.log('Next lesson page loaded.');
//             } catch (error) {
//                 console.error('Error while waiting for page load:', error.message);
//                 return false;
//             }

//             console.log('Next lesson page loaded. Preparing to download...');
//             try {
//                 console.log('Waiting for the Action menu button...');
//                 await page.waitForSelector(actionMenuSelector, { timeout: 5000 });
//                 const actionMenuButtons = await page.$$(actionMenuSelector);
//                 console.log(`Found ${actionMenuButtons.length} action menu buttons.`);

//                 if (actionMenuButtons.length >= 2) {
//                     console.log('Clicking the second Action menu button...');
//                     await actionMenuButtons[1].click();
//                     await delay(2000); // Small delay to allow menu options to render

//                     console.log('Waiting for the download link...');
//                     await page.waitForSelector(downloadLinkSelector, { timeout: 5000 });
//                     const downloadLink = await page.$(downloadLinkSelector);

//                     if (downloadLink) {
//                         console.log('Clicking the download link...');
//                         await downloadLink.click();
//                         console.log('Download initiated.');
//                         await delay(30000); // Ensure sufficient time for the download
//                     } else {
//                         console.error('Download link not found.');
//                     }
//                 } else {
//                     console.error('Not enough Action menu buttons found.');
//                 }
//             } catch (error) {
//                 console.error('Error during download process:', error.message);
//             }
//             return true;
//         };

//         // Main loop to navigate and download all lessons
//         while (true) {
//             const shouldContinue = await navigateAndDownload();
//             if (!shouldContinue) break;
//         }

//     } catch (error) {
//         console.error('An error occurred:', error.message);
//     } finally {
//         console.log('Closing browser...');
//         await browser.close();
//     }
// })();






//Navigation Stable Version
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');

// // Helper function for delays
// const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// (async () => {
//     const browser = await puppeteer.launch({
//         headless: false,
//         slowMo: 50,
//         args: [
//             '--no-sandbox',
//             '--disable-software-rasterizer',
//             '--disable-infobars',
//             '--disable-notifications',
//             '--disable-extensions',
//             '--disable-dialogs'
//         ]
//     });
//     const page = await browser.newPage();

//     try {
//         const cookiesPath = path.resolve(__dirname, 'cookies.json');

//         // Load cookies if saved
//         if (fs.existsSync(cookiesPath)) {
//             const cookies = JSON.parse(fs.readFileSync(cookiesPath));
//             await page.setCookie(...cookies);
//             console.log('Cookies loaded successfully!');
//         } else {
//             console.error('No cookies found! Please log in manually first.');
//             await browser.close();
//             return;
//         }

//         // Navigate to the lesson outline page
//         console.log('Navigating to the outline page...');
//         await page.goto('https://myarkview.org/admin-app/courses/312551/curriculum/lessons/4889689', {
//             waitUntil: 'networkidle0',
//         });
//         console.log('Page loaded successfully!');

//         // Selectors for active lesson and lesson links
//         const activeLessonSelector = '.Outline_active__18Nx9';
//         const lessonLinkSelector = '.Outline_outlineLink__1xmZY';

//         // Wait for the active lesson to appear
//         console.log('Waiting for the active lesson...');
//         await page.waitForSelector(activeLessonSelector, { timeout: 30000 });
//         const activeLessonElement = await page.$(activeLessonSelector);
//         const activeLessonText = await page.evaluate(el => el.innerText.trim(), activeLessonElement);
//         console.log(`Active lesson text: ${activeLessonText}`);

//         // Extract the number from the active lesson (e.g., "#36")
//         const activeLessonNumberMatch = activeLessonText.match(/#(\d+)/);
//         if (!activeLessonNumberMatch) {
//             console.error('Failed to extract the lesson number from the active lesson text.');
//             return;
//         }
//         const activeLessonNumber = parseInt(activeLessonNumberMatch[1], 10);
//         const nextLessonNumber = activeLessonNumber + 1;
//         console.log(`Active lesson number: ${activeLessonNumber}, Next lesson number: ${nextLessonNumber}`);

//         // Find all lesson links
//         console.log('Finding all lesson links...');
//         const lessonLinks = await page.$$(lessonLinkSelector);

//         // Search for the lesson link with the next number
//         let nextLessonLink = null;
//         for (let i = 0; i < lessonLinks.length; i++) {
//             const linkText = await page.evaluate(el => el.innerText.trim(), lessonLinks[i]);
//             console.log(`Checking lesson: ${linkText}`);
//             if (linkText.includes(`#${nextLessonNumber}`)) {
//                 nextLessonLink = lessonLinks[i];
//                 console.log(`Found next lesson: ${linkText}`);
//                 break;
//             }
//         }

//         if (nextLessonLink) {
//             console.log('Scrolling to next lesson and clicking...');
//             await nextLessonLink.scrollIntoView();
//             await delay(1000); // Wait for smooth scrolling
//             await nextLessonLink.click();
//             console.log('Next lesson clicked successfully!');

//             // Wait for the next page to load
//             console.log('Waiting for the next lesson page to load...');
//             await page.waitForNavigation({ waitUntil: 'networkidle0' });
//             console.log('Next lesson page loaded.');
//         } else {
//             console.log('No next lesson link found with the expected numbering pattern.');
//         }
//     } catch (error) {
//         console.error('An error occurred:', error.message);
//     } finally {
//         console.log('Closing browser...');
//         await delay(5000); // Keep the browser open for observation before closing
//         await browser.close();
//     }
// })();





// Example usage:
// (async () => {
//     await navigateToNextLesson();
// })();



// Example usage:
// await navigateToNextLesson(page);





//Download Stable Version
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');

// // Helper function for delays
// const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// (async () => {
//     const browser = await puppeteer.launch({
//         headless: false, // Ensure browser is visible
//         slowMo: 50, // Add 50ms delay between each action
//         args: [
//             '--no-sandbox',
//             '--disable-software-rasterizer',
//             '--disable-infobars', // Disables the "Chrome is being controlled by automated test software" infobar
//             '--disable-notifications', // Disables notifications that might pop up
//             '--disable-extensions', // Disables extensions which could trigger popups
//             '--disable-dialogs' // Disables any dialogs (including the "Download in progress" warning)
//         ]
//     });
//     const page = await browser.newPage();

//     try {
//         const cookiesPath = path.resolve(__dirname, 'cookies.json');
//         const downloadPath = path.resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads');
//         fs.mkdirSync(downloadPath, { recursive: true });

//         // Load cookies if saved
//         if (fs.existsSync(cookiesPath)) {
//             const cookies = JSON.parse(fs.readFileSync(cookiesPath));
//             await page.setCookie(...cookies);
//             console.log('Cookies loaded successfully!');
//         } else {
//             await page.goto('https://myarkview.org/sign_in');
//             await page.type('#email', 'kazimuhammadali11@gmail.com');
//             await page.click('#otp-login-btn');
//             console.log('Please enter OTP manually...');
//             await page.waitForNavigation({ waitUntil: 'networkidle0' });

//             const cookies = await page.cookies();
//             fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
//             console.log('Cookies saved successfully!');
//         }

//         // Set download behavior
//         await page._client().send('Page.setDownloadBehavior', {
//             behavior: 'allow',
//             downloadPath: downloadPath,
//         });

//         // Navigate to the lesson page
//         console.log('Navigating to the lesson page...');
//         await page.goto('https://myarkview.org/admin-app/courses/312551/curriculum/lessons/4889689', {
//             waitUntil: 'networkidle0', // Wait for the page to fully load
//         });
//         console.log('Page loaded successfully!');

//         const actionMenuButtonSelector = 'button[aria-label="Action menu"]';
//         console.log('Waiting for the action menu button...');
//         await page.waitForSelector(actionMenuButtonSelector, { timeout: 60000 });
//         console.log('Action menu button found.');

//         const actionMenuButtons = await page.$$(actionMenuButtonSelector);
//         console.log(`Found ${actionMenuButtons.length} action menu buttons.`);

//         if (actionMenuButtons.length >= 2) {
//             console.log('Clicking on the second action menu button...');
//             await actionMenuButtons[1].scrollIntoView();
//             await delay(2000); // Pause for observation before clicking
//             await actionMenuButtons[1].click();
//             console.log('Clicked on the second action menu button.');
//             await delay(2000); // Pause for observation after clicking
//         } else {
//             console.error('Less than 2 action menu buttons found!');
//             return; // Exit script if action menu buttons are insufficient
//         }

//         const downloadLinkSelector = 'a[aria-label^="Download file"]';
//         console.log('Waiting for the download link...');
//         await page.waitForSelector(downloadLinkSelector, { timeout: 30000 });
//         console.log('Download link found.');

//         const downloadLink = await page.$(downloadLinkSelector);
//         if (downloadLink) {
//             console.log('Clicking the download link...');
//             await delay(2000); // Pause for observation before clicking download
//             await downloadLink.click();
//             console.log('Download triggered.');

//             // Wait for a fixed amount of time to ensure download has time to complete
//             const downloadTimeout = 30000; // Wait for 30 seconds (adjust as needed)
//             console.log(`Waiting for ${downloadTimeout / 1000} seconds for the download to complete...`);
//             await delay(downloadTimeout);

//             console.log('Download wait period complete.');

//         } else {
//             console.error('Download link not found!');
//         }

//     } catch (error) {
//         console.error('An error occurred:', error.message);
//     } finally {
//         console.log('Closing browser...');
//         await browser.close(); // Browser will only close after the wait period
//     }
// })();




// This one properly clicks on download
//const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');

// // Helper function for delays
// const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// (async () => {
//     const browser = await puppeteer.launch({
//         headless: false, // Ensure browser is visible
//         slowMo: 50 // Add 50ms delay between each action
//     });
//     const page = await browser.newPage();

//     try {
//         const cookiesPath = path.resolve(__dirname, 'cookies.json');
//         const downloadPath = path.resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads');
//         fs.mkdirSync(downloadPath, { recursive: true });

//         // Load cookies if saved
//         if (fs.existsSync(cookiesPath)) {
//             const cookies = JSON.parse(fs.readFileSync(cookiesPath));
//             await page.setCookie(...cookies);
//             console.log('Cookies loaded successfully!');
//         } else {
//             await page.goto('https://myarkview.org/sign_in');
//             await page.type('#email', 'kazimuhammadali11@gmail.com');
//             await page.click('#otp-login-btn');
//             console.log('Please enter OTP manually...');
//             await page.waitForNavigation({ waitUntil: 'networkidle0' });

//             const cookies = await page.cookies();
//             fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
//             console.log('Cookies saved successfully!');
//         }

//         // Set download behavior
//         await page._client().send('Page.setDownloadBehavior', {
//             behavior: 'allow',
//             downloadPath: downloadPath,
//         });

//         // Navigate to the lesson page
//         console.log('Navigating to the lesson page...');
//         await page.goto('https://myarkview.org/admin-app/courses/312551/curriculum/lessons/4889689');

//         const actionMenuButtonSelector = 'button[aria-label="Action menu"]';
//         console.log('Waiting for the action menu button...');
//         await page.waitForSelector(actionMenuButtonSelector, { timeout: 60000 });
//         console.log('Action menu button found.');

//         const actionMenuButtons = await page.$$(actionMenuButtonSelector);
//         console.log(`Found ${actionMenuButtons.length} action menu buttons.`);

//         if (actionMenuButtons.length >= 2) {
//             console.log('Clicking on the second action menu button...');
//             await actionMenuButtons[1].scrollIntoView();
//             await delay(2000); // Pause for observation before clicking
//             await actionMenuButtons[1].click();
//             console.log('Clicked on the second action menu button.');
//             await delay(2000); // Pause for observation after clicking
//         } else {
//             console.error('Less than 2 action menu buttons found!');
//             return; // Exit script if action menu buttons are insufficient
//         }

//         const downloadLinkSelector = 'a[aria-label^="Download file"]';
//         console.log('Waiting for the download link...');
//         await page.waitForSelector(downloadLinkSelector, { timeout: 30000 });
//         console.log('Download link found.');

//         const downloadLink = await page.$(downloadLinkSelector);
//         if (downloadLink) {
//             console.log('Clicking the download link...');
//             await delay(2000); // Pause for observation before clicking download
//             await downloadLink.click();
//             console.log('Download triggered.');

//             let fileDownloaded = false;
//             const downloadTimeout = 30000;

//             const checkDownload = async () => {
//                 const files = fs.readdirSync(downloadPath);
//                 return files.some(file => file.endsWith('.mp4'));
//             };

//             const startTime = Date.now();
//             while (!fileDownloaded && Date.now() - startTime < downloadTimeout) {
//                 fileDownloaded = await checkDownload();
//                 if (!fileDownloaded) {
//                     console.log('Waiting for download to complete...');
//                     await delay(2000);
//                 }
//             }

//             if (fileDownloaded) {
//                 console.log('Download completed.');
//             } else {
//                 console.error('Download did not complete within the expected time.');
//             }
//         } else {
//             console.error('Download link not found!');
//         }

//     } catch (error) {
//         console.error('An error occurred:', error.message);
//     } finally {
//         console.log('Closing browser...');
//         await browser.close();
//     }
// })();



// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');

// // Helper function for delays
// const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// (async () => {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     const cookiesPath = path.resolve(__dirname, 'cookies.json');
//     const downloadPath = path.resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads');
//     fs.mkdirSync(downloadPath, { recursive: true });

//     // Load cookies if saved
//     if (fs.existsSync(cookiesPath)) {
//         const cookies = JSON.parse(fs.readFileSync(cookiesPath));
//         await page.setCookie(...cookies);
//         console.log('Cookies loaded successfully!');
//     } else {
//         // Navigate to the login page if cookies don't exist
//         await page.goto('https://myarkview.org/sign_in');
//         await page.type('#email', 'kazimuhammadali11@gmail.com');
//         await page.click('#otp-login-btn');
//         console.log('Please enter OTP manually...');
//         await page.waitForNavigation({ waitUntil: 'networkidle0' });

//         // Save cookies after logging in
//         const cookies = await page.cookies();
//         fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
//         console.log('Cookies saved successfully!');
//     }

//     // Set download behavior
//     await page._client().send('Page.setDownloadBehavior', {
//         behavior: 'allow',
//         downloadPath: downloadPath,
//     });

//     // Navigate to the first lesson page
//     await page.goto('https://myarkview.org/admin-app/courses/312551/curriculum/lessons/4889689');
//     console.log('Navigating to the lesson page...');

//     // Wait for the outline container to load
//     const outlineSelector = '#idref-content-menu > nav > div.Outline_scrollContainer__2uTW6 > ul';
//     await page.waitForSelector(outlineSelector, { timeout: 60000 });
//     console.log('Outline loaded.');

//     // Extract the list of lesson links
//     const lessonLinks = await page.evaluate(() => {
//         const links = [];
//         const outline = document.querySelector('#idref-content-menu > nav > div.Outline_scrollContainer__2uTW6 > ul');
//         const activeLesson = document.querySelector('div.OlK8P.Outline_active__18Nx9');

//         if (!outline) {
//             console.error('Outline container not found!');
//             return links;
//         }

//         let startCollecting = false;
//         outline.querySelectorAll('li').forEach(item => {
//             const link = item.querySelector('a'); // Find the <a> tag inside the <li>
//             if (startCollecting && link) {
//                 links.push(link.href);
//             }
//             // Start collecting links after the active lesson
//             if (activeLesson && item.contains(activeLesson)) {
//                 startCollecting = true;
//             }
//         });

//         console.log(`Debug: Found ${links.length} links in the outline.`);
//         return links;
//     });

//     console.log(`Found ${lessonLinks.length} lesson links to process.`);

//     if (lessonLinks.length === 0) {
//         console.error('No lesson links found. Verify the structure of the outline.');
//         return;
//     }

//     // Process each lesson link sequentially
//     for (const lessonLink of lessonLinks) {
//         console.log(`Navigating to ${lessonLink}...`);
//         await page.goto(lessonLink);

//         // Wait for the action menu button
//         const actionMenuButtonSelector = 'button[aria-label="Action menu"]';
//         await page.waitForSelector(actionMenuButtonSelector, { timeout: 60000 });
//         console.log('Action menu button found.');

//         // Click the second action menu button
//         const actionMenuButtons = await page.$$(actionMenuButtonSelector);
//         if (actionMenuButtons.length >= 2) {
//             console.log('Clicking on the second action menu button...');
//             await page.evaluate(btn => btn.scrollIntoView(), actionMenuButtons[1]); // Scroll into view
//             await actionMenuButtons[1].click(); // Click the button
//         } else {
//             console.error('Less than 2 action menu buttons found.');
//             break;
//         }

//         // Wait for the download link inside the action menu
//         await page.waitForSelector('a[aria-label^="Download file"]');
//         console.log('Download link found.');

//         // Click the download link
//         const downloadLink = await page.$('a[aria-label^="Download file"]');
//         if (downloadLink) {
//             console.log('Clicking the download link...');
//             await downloadLink.click();
//             console.log('Download triggered.');

//             // Wait for the download to complete by checking the file system
//             let fileDownloaded = false;
//             const downloadTimeout = 30000;

//             const checkDownload = async () => {
//                 const files = fs.readdirSync(downloadPath);
//                 return files.some(file => file.endsWith('.mp4'));
//             };

//             const startTime = Date.now();
//             while (!fileDownloaded && Date.now() - startTime < downloadTimeout) {
//                 fileDownloaded = await checkDownload();
//                 if (!fileDownloaded) {
//                     console.log('Waiting for download to complete...');
//                     await delay(2000);
//                 }
//             }

//             if (fileDownloaded) {
//                 console.log('Download completed.');
//             } else {
//                 console.error('Download did not complete within the expected time.');
//             }
//         } else {
//             console.error('Download link not found!');
//             break;
//         }

//         // Wait before processing the next lesson
//         await delay(5000);
//     }

//     console.log('All lessons processed.');
//     await browser.close();
// })();


//document.querySelectorAll('#idref-content-menu > nav > div.Outline_scrollContainer__2uTW6 > ul > li:nth-child(19) > ul > li > div')
//NodeList [div.OlK8P.Outline_active__18Nx9.Outline_ellipsisAndLineClamp__1qI3h.jumpToActiveClass]
