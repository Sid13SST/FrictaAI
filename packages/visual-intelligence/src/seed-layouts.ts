import { PrismaClient } from '@fricta/db';

const prisma = new PrismaClient();

async function main() {
  const sessionId = 'bcd7886c-d9d8-4b3c-8e25-b6dbe9d1d6f5';
  console.log(`Seeding screenshots in session ${sessionId} with diverse layout metadata...`);

  // Fetch screenshots
  const screenshots = await prisma.workflowScreenshot.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { stepIndex: 'asc' }
  });

  if (screenshots.length < 6) {
    console.error('Expected at least 6 screenshots for the target session. Found:', screenshots.length);
    process.exit(1);
  }

  // 1. Screenshot 1 (Step 1): Clean landing page
  await prisma.workflowScreenshot.update({
    where: { id: screenshots[0].id },
    data: {
      metadata: {
        ...(screenshots[0].metadata as any),
        layout: {
          regions: [
            { type: 'header', box: { x: 0, y: 0, w: 1280, h: 80 } },
            { type: 'footer', box: { x: 0, y: 720, w: 1280, h: 80 } }
          ],
          elements: [
            { id: 'el-btn-cta', role: 'button', text: 'Get Started', intent: 'primary', box: { x: 540, y: 350, w: 200, h: 50 } },
            { id: 'el-heading-1', role: 'heading', text: 'Welcome to Gradonix', box: { x: 300, y: 200, w: 680, h: 60 } }
          ]
        }
      }
    }
  });

  // 2. Screenshot 2 (Step 2): High Input Form Density
  const formInputs = Array.from({ length: 12 }, (_, i) => ({
    id: `el-input-${i}`,
    role: 'input',
    text: '',
    box: { x: 450, y: 150 + i * 40, w: 380, h: 30 }
  }));
  await prisma.workflowScreenshot.update({
    where: { id: screenshots[1].id },
    data: {
      metadata: {
        ...(screenshots[1].metadata as any),
        layout: {
          regions: [
            { type: 'form', box: { x: 400, y: 100, w: 480, h: 600 } }
          ],
          elements: formInputs
        }
      }
    }
  });

  // 3. Screenshot 3 (Step 3): Sidebar Overload
  const sidebarLinks = Array.from({ length: 14 }, (_, i) => ({
    id: `el-link-${i}`,
    role: 'link',
    text: `Nav Link ${i + 1}`,
    box: { x: 20, y: 100 + i * 35, w: 180, h: 25 }
  }));
  await prisma.workflowScreenshot.update({
    where: { id: screenshots[2].id },
    data: {
      metadata: {
        ...(screenshots[2].metadata as any),
        layout: {
          regions: [
            { type: 'sidebar', box: { x: 0, y: 0, w: 240, h: 800 } }
          ],
          elements: sidebarLinks
        }
      }
    }
  });

  // 4. Screenshot 4 (Step 5): Empty State Guidance Friction
  await prisma.workflowScreenshot.update({
    where: { id: screenshots[3].id },
    data: {
      metadata: {
        ...(screenshots[3].metadata as any),
        layout: {
          regions: [],
          elements: [
            { id: 'el-empty-txt', role: 'text', text: 'No projects found. Welcome to your empty dashboard.', box: { x: 400, y: 300, w: 480, h: 40 } }
          ]
        }
      }
    }
  });

  // 5. Screenshot 5 (Step 5): Overlapping Elements (Clutter)
  await prisma.workflowScreenshot.update({
    where: { id: screenshots[4].id },
    data: {
      metadata: {
        ...(screenshots[4].metadata as any),
        layout: {
          regions: [],
          elements: [
            { id: 'el-overlap-1', role: 'button', text: 'Apply Filters', box: { x: 100, y: 100, w: 150, h: 40 } },
            { id: 'el-overlap-2', role: 'text', text: 'Search Results (0 items found)', box: { x: 120, y: 120, w: 250, h: 30 } } // Overlaps el-overlap-1
          ]
        }
      }
    }
  });

  // 6. Screenshot 6 (Step 7): Excessive Interface Density
  const denseElements = Array.from({ length: 45 }, (_, i) => ({
    id: `el-dense-${i}`,
    role: i % 4 === 0 ? 'button' : i % 4 === 1 ? 'input' : i % 4 === 2 ? 'link' : 'text',
    text: `Element ${i}`,
    box: { x: (i % 5) * 200 + 100, y: Math.floor(i / 5) * 70 + 100, w: 120, h: 30 }
  }));
  await prisma.workflowScreenshot.update({
    where: { id: screenshots[5].id },
    data: {
      metadata: {
        ...(screenshots[5].metadata as any),
        layout: {
          regions: [],
          elements: denseElements
        }
      }
    }
  });

  console.log('✅ Successfully seeded diverse layout metadata!');
}

main()
  .catch(err => {
    console.error('Error seeding metadata:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
