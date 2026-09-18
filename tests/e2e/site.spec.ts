import { expect, test } from "@playwright/test";

test("public routes and responsive layout work",async({page})=>{
  for(const route of ['/','/food','/drinks','/ip','/premium']){await page.goto(route);await expect(page.locator('.caseCard')).toHaveCount(23);await expect(page.locator('body')).not.toHaveCSS('overflow-x','scroll')}
  await page.locator('.caseCard').first().click();await expect(page.locator('.workHero')).toBeVisible();await expect(page.locator('.mediaFlow figure')).toHaveCount(8);
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.caseCard').first()).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);expect(overflow).toBe(false);
});

test("admin login, CRUD, upload, ordering and version priority work",async({page})=>{
  await page.goto('/admin');await page.getByLabel('管理员密码').fill('wrong');await page.getByRole('button',{name:'登录'}).click();await expect(page.locator('.formError')).toContainText('密码错误');
  await page.getByLabel('管理员密码').fill('e2e-password');await page.getByRole('button',{name:'登录'}).click();await expect(page.getByRole('heading',{name:'案例管理'})).toBeVisible();
  const firstBefore=await page.locator('.adminCaseName strong').first().textContent();await page.locator('.adminCaseList article').nth(1).dragTo(page.locator('.adminCaseList article').first());await page.getByRole('button',{name:'保存排序'}).click();await expect(page.locator('.saveMessage')).toContainText('已保存');await page.reload();expect(await page.locator('.adminCaseName strong').first().textContent()).not.toBe(firstBefore);
  await page.getByRole('link',{name:'新建案例'}).click();await expect(page).toHaveURL(/\/admin\/cases\/new/);await page.getByLabel('名称',{exact:true}).fill('测试案例');await page.getByLabel('Slug',{exact:true}).fill('e2e-test-case');await page.getByLabel('主要行业').fill('测试');
  const mediaInputs=page.locator('.mediaInput input[type="file"]');await mediaInputs.first().setInputFiles('public/media/cases/N013/cover.webp');await expect(page.locator('.mediaPreview')).toHaveCount(1);await mediaInputs.nth(1).setInputFiles('public/media/cases/N013/hero.webp');await expect(page.locator('.mediaPreview')).toHaveCount(2);
  await page.getByText('发布到前台').click();await page.getByRole('button',{name:'保存案例'}).click();const testRow=page.locator('.adminCaseList article').filter({hasText:'测试案例'});await expect(testRow).toBeVisible();
  await testRow.getByRole('link',{name:'编辑'}).click();await expect(page).toHaveURL(/\/admin\/cases\//);await page.getByLabel('简介').fill('浏览器自动化编辑成功');await page.getByRole('button',{name:'保存案例'}).click();await expect(testRow).toBeVisible();
  const food=page.locator('.versionCard').filter({hasText:'Food'});await food.locator('summary').click();await food.getByLabel('名称',{exact:true}).fill('Food Test');await food.getByLabel('Slug',{exact:true}).fill('food-e2e');await food.locator('select').first().selectOption({label:'测试案例'});const versionSaved=page.waitForResponse((response)=>response.url().endsWith('/api/admin/versions/food')&&response.request().method()==='PUT');await food.getByRole('button',{name:'保存版本'}).click();expect((await versionSaved).ok()).toBe(true);await page.goto('/food-e2e');await expect(page.getByRole('heading',{name:'Food Test branding works'})).toBeVisible();await page.goto('/admin');
  await testRow.getByRole('button',{name:'已发布'}).click();await expect(testRow.getByRole('button',{name:'草稿'})).toBeVisible();page.on('dialog',(dialog)=>dialog.accept());await testRow.getByRole('button',{name:'删除'}).click();await expect(testRow).toHaveCount(0);
});
