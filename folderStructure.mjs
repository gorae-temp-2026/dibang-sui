import { createFolderStructure } from "eslint-plugin-project-structure";

export const folderStructureConfig = createFolderStructure({
  structureRoot: "src",
  structure: [
    {
      name: "components",
      children: [
        {
          name: "shared",
          children: [
            { name: "{PascalCase}.tsx" },
            { name: "{camelCase}.ts" },
            { name: "{camelCase}.css" },
          ],
        },
        {
          name: "{kebab-case}",
          children: [
            { name: "{PascalCase}.tsx" },
            { name: "{camelCase}.ts" },
            { name: "{camelCase}.css" },
          ],
        },
      ],
    },
    {
      name: "hooks",
      children: [
        {
          name: "shared",
          children: [
            { name: "{camelCase}.ts" },
          ],
        },
        {
          name: "{kebab-case}",
          children: [
            { name: "{camelCase}.ts" },
          ],
        },
      ],
    },
    { name: "*" },
  ],
});
