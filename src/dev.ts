import Automizer, { modify } from './index';

const run = async () => {
  const automizer = new Automizer({
    templateDir: `${__dirname}/../__tests__/pptx-templates`,
    outputDir: `${__dirname}/../__tests__/pptx-output`,
    // autoImportSlideMasters: true,
    showIntegrityInfo: true,
    assertRelatedContents: true,
    useCreationIds: true,
  });

  const pres = automizer
    .loadRoot(`RootTemplate.pptx`)
    .load(`SlideWithShapes.pptx`, 'shapes');

  const result = await pres
    .addSlide('shapes', 2, (slide) => {
      slide.modifyElement('Drum', [modify.rotateShape(45)]);
      slide.modifyElement('Cloud', [modify.rotateShape(-45)]);
      slide.modifyElement('Arrow', [modify.rotateShape(180)]);
    })
    .write(`modify-shapes-rotate.test.pptx`);
};

run().catch((error) => {
  console.error(error);
});
