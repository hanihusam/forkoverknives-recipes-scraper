const puppeteer = require('puppeteer');
const xlsx = require('xlsx');

async function getLinks() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(
    'https://fitfoodiefinds.com/recipe-search/?fwp_meal=lunch-dinner&fwp_diet=vegan'
  );
  let links = [];

  while (await page.$('.pagination .pagination-next > a')) {
    const newLinks = await page.$$eval(
      '.post .entry-header .entry-title > a',
      (allLinks) => allLinks.map((link) => link.href)
    );

    links = [...links, ...newLinks];
    try {
      await page.waitForNetworkIdle({ timeout: 0 });
      await page.click('.pagination .pagination-next > a');
    } catch (error) {
      break;
    }
  }

  const newLinks = await page.$$eval(
    '.post .entry-header .entry-title > a',
    (allLinks) => allLinks.map((link) => link.href)
  );

  links = [...links, ...newLinks];

  await browser.close();
  return links;
}

async function scrapeRecipe(link, page) {
  try {
    await page.goto(link);
  } catch (error) {
    console.log(error);
  }

  let name, ingredients, instructions, nutritions, review;

  try {
    name = await page.$eval('.tasty-recipes-title', (name) => name.innerText);
  } catch (error) {
    name = 'No name';
  }

  try {
    review = await page.$eval(
      '.tasty-recipes-rating-label',
      (name) => name.innerText
    );
  } catch (error) {
    review = 'No review';
  }

  try {
    ingredients = await page.$$eval(
      '.tasty-recipes-ingredients ul > li',
      (ingredients) => ingredients.map((ingredient) => ingredient.innerText)
    );
  } catch (error) {
    ingredients = 'No ingredients';
  }

  try {
    instructions = await page.$$eval(
      '.tasty-recipes-instructions ol li',
      (instructions) => instructions.map((instruction) => instruction.innerText)
    );
  } catch (error) {
    instructions = 'No instructions';
  }

  try {
    nutritions = await page.$$eval(
      '.tasty-recipes-nutrition .nutrition-item',
      (nutritions) => nutritions.map((instruction) => instruction.innerText)
    );
  } catch (error) {
    nutritions = 'No nutritions';
  }

  return {
    name,
    review,
    ingredients: ingredients.join('\n'),
    instructions: instructions.join('\n'),
    nutritions: nutritions.join('\n'),
  };
}

async function main() {
  const allLinks = await getLinks();

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  let scrapedData = [];

  for (let link of allLinks) {
    const data = await scrapeRecipe(link, page);
    scrapedData = [...scrapedData, data];
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(scrapedData);
  xlsx.utils.book_append_sheet(wb, ws);
  xlsx.writeFile(wb, 'launch-recipes.xlsx');
}

main();
