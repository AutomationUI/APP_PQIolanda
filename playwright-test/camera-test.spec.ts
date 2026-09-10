import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Câmera e Recorte 3x4 em Formulario Web App', () => {
  const testImagePath = path.join(__dirname, 'sample_test_image.png');

  test.beforeAll(() => {
    const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    fs.writeFileSync(testImagePath, Buffer.from(dummyPngBase64, 'base64'));
  });

  test.afterAll(() => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  test('Deve abrir diretamente na Aba da Foto 3x4 (Aba 1) e verificar componentes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // A página agora abre diretamente na Aba 1 (Foto 3x4)
    await expect(page.locator('#aba1')).toBeVisible();

    const btnCamera = page.locator('#btnAbrirCameraModal');
    const labelGaleria = page.locator('label[for="inputGaleriaFoto"]');

    await expect(btnCamera).toBeVisible();
    await expect(labelGaleria).toBeVisible();
  });

  test('Deve permitir alternar livremente entre as 4 abas sem bloqueio', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Alternar para a Aba 2 (Criança)
    await page.click('#st2');
    await expect(page.locator('#aba2')).toBeVisible();

    // Alternar para a Aba 3 (Responsáveis)
    await page.click('#st3');
    await expect(page.locator('#aba3')).toBeVisible();

    // Alternar para a Aba 4 (Anexos & Termos)
    await page.click('#st4');
    await expect(page.locator('#aba4')).toBeVisible();

    // Alternar de volta para a Aba 1 (Foto)
    await page.click('#st1');
    await expect(page.locator('#aba1')).toBeVisible();
  });

  test('Deve fazer upload de imagem, recortar em 3x4 e gerar fotoBase64', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Fazer upload diretamente na Aba 1 (Foto 3x4 já aberta na inicialização)
    await page.setInputFiles('#inputGaleriaFoto', testImagePath);
    await page.waitForTimeout(600);

    const previewImg = page.locator('#preview');
    await expect(previewImg).toBeVisible();

    const fotoBase64Val = await page.evaluate(() => (window as any).fotoBase64);
    expect(fotoBase64Val).toBeTruthy();
    expect(fotoBase64Val).toContain('data:image/jpeg;base64,');

    const botoesContainer = page.locator('#botoesCameraContainer');
    const btnRefazer = page.locator('#btnRefazer');
    await expect(botoesContainer).toBeHidden();
    await expect(btnRefazer).toBeVisible();

    // Testar reset
    await btnRefazer.click();
    const fotoBase64Reset = await page.evaluate(() => (window as any).fotoBase64);
    expect(fotoBase64Reset).toBe('');
    await expect(previewImg).toBeHidden();
    await expect(botoesContainer).toBeVisible();
    await expect(btnRefazer).toBeHidden();
  });
});