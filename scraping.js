const puppeteer = require('puppeteer');
const xlsx = require('xlsx');

async function getLinks() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.forksoverknives.com/recipes/?type=grid');
  let links = [];

  while ((await page.$('.pagination .next.disabled')) === null) {
    const newLinks = await page.$$eval(
      '.inner :not(.promo).post-item .container .row .col.content-block h3 a',
      (allLinks) => allLinks.map((link) => link.href)
    );

    links = [...links, ...newLinks];
    await page.click('.pagination .next a');
    await page.waitForNavigation({ timeout: 0 });
  }

  await browser.close();
  return links;
}

async function scrapeRecipe(id, link, page) {
  await page.goto(link);
  let name, category, ingredients, instructions;

  try {
    name = await page.$eval('.banner-block h1', (name) => name.innerText);
  } catch (error) {
    name = 'not a data';
  }
  try {
    category = await page.$eval(
      '.banner-block ul li:last-child a',
      (category) => category.innerText
    );
  } catch (error) {
    category = 'not a data';
  }
  try {
    ingredients = await page.$$eval(
      '.section-ingredients li span',
      (ingredients) => ingredients.map((ingredient) => ingredient.innerText)
    );
  } catch (error) {
    ingredients = 'not a data';
  }
  try {
    instructions = await page.$$eval(
      '.section-instruction .instruction-box ol li',
      (instructions) => instructions.map((instruction) => instruction.innerText)
    );
  } catch (error) {
    instructions = 'not a data';
  }

  return {
    id,
    name,
    category,
    ingredients: ingredients.join('\n'),
    instructions: instructions.join('\n'),
  };
}

async function main() {
  let id = 1;
  const allLinks = await getLinks();

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const scrapedData = [];

  for (let link of allLinks) {
    const data = await scrapeRecipe(id, link, page);
    scrapedData.push(data);
    id++;
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(scrapedData);
  xlsx.utils.book_append_sheet(wb, ws);
  xlsx.writeFile(wb, 'recipes.xlsx');
}

main();
