# 🍇 grapesjs-hbs-react

A **React component library** that wraps [GrapesJS](https://grapesjs.com) with **Handlebars.js integration**, making it easy to build, preview, and export dynamic Handlebars templates inside your React applications.

---

## ✨ Features

* ⚛️ React component (`<TemplateEditor />`) ready to use
* 🧩 Built on top of **GrapesJS** and **Handlebars**
* 🔌 Modular architecture (blocks, event handlers, adapters, utilities)
* 📤 Export editor content back to `.hbs` format
* 👀 Live preview with sample data
* 🎛️ Easily bind variables from JSON data sources

---

## 📦 Installation

```bash
npm install grapesjs-hbs-react
```

> ⚠️ This library requires `react`, `react-dom`, `grapesjs`, `handlebars`, and GrapesJS plugins.
> They are marked as **peer dependencies**, so make sure they are installed:

```bash
npm install react react-dom grapesjs grapesjs-blocks-basic grapesjs-preset-webpage handlebars
```

---

## 🚀 Usage

```tsx
import React from "react";
import { TemplateEditor } from "grapesjs-hbs-react";

const handlebarCode = `<div>{{title}}</div>`;
const handlebarJSON = { title: "Hello World!" };

function App() {
  return (
    <div style={{ height: 600, width: "100%", border: "1px solid #ddd" }}>
      <TemplateEditor
        initialHbs={handlebarCode}
        sampleData={handlebarJSON}
        dataSources={handlebarJSON}
        onExport={(hbs) => console.log("Exported HBS:", hbs)}
      />
    </div>
  );
}

export default App;
```

---

## ⚙️ Props

| Prop          | Type                    | Default                | Description                                 |
| ------------- | ----------------------- | ---------------------- | ------------------------------------------- |
| `initialHbs`  | `string`                | `<div>{{title}}</div>` | Initial Handlebars template to load         |
| `sampleData`  | `Record<string, any>`   | `{ title: "Hello" }`   | Sample JSON data for rendering variables    |
| `dataSources` | `Record<string, any>`   | `{}`                   | Data sources available for variable binding |
| `onExport`    | `(hbs: string) => void` | `undefined`            | Callback triggered when exporting `.hbs`    |

---

## 🛠 Development

Clone repo and install dependencies:

```bash
git clone https://github.com/your-username/grapesjs-hbs-react.git
cd grapesjs-hbs-react
npm install
```

Build the library:

```bash
npm run build
```

Test locally in another project:

```bash
npm pack   # generates grapesjs-hbs-react-x.y.z.tgz
# then install it in your app
npm install ../grapesjs-hbs-react-x.y.z.tgz
```

---

## 📜 License

MIT © 2025 Templify
