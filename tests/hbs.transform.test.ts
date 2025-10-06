// tests/hbs-transform.test.ts
import { hbsToAnnotatedHtml, annotatedHtmlToHbs } from '../src/modules/hbs-transform';

const normalize = (s: string) => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

const data = {
    receiptTitle: 'Sales Receipt',
    company: { name: 'Acme Retail Solutions' },
    items: [
        { name: 'Premium Wireless Headphones', quantity: 1, price: '$149.99', amount: '$149.99' },
        { name: 'Smartphone Protective Case', quantity: 2, price: '$24.99', amount: '$49.98' },
    ],
    simpleArray: ['Premium Wireless Headphones', 'Smartphone Protective Case'],
    categories: [
      {
        title: "Electronics",
        items: [
          { name: "Laptop", price: "$999" },
          { name: "Headphones", price: "$199" },
        ],
      },
      {
        title: "Accessories",
        items: [
          { name: "Mouse", price: "$49" },
          { name: "Keyboard", price: "$89" },
        ],
      },
    ],
};


describe('hbsToAnnotatedHtml (HBS ➜ annotated HTML)', () => {
    it('Use case 1: wraps simple variable', () => {
        const hbs = `<div class="receipt-title">{{receiptTitle}}</div>`;
        const html = hbsToAnnotatedHtml(hbs, data);

        const expected =
            `<div class="receipt-title">` +
            `<span data-hbs="{{receiptTitle}}" class="hbs-token">Sales Receipt</span>` +
            `</div>`;

        expect(normalize(html)).toBe(normalize(expected));
    });

    it('Use case 2: wraps nested path', () => {
        const hbs = `<div class="company-name">{{company.name}}</div>`;
        const html = hbsToAnnotatedHtml(hbs, data);

        const expected =
            `<div class="company-name">` +
            `<span data-hbs="{{company.name}}" class="hbs-token">Acme Retail Solutions</span>` +
            `</div>`;

        expect(normalize(html)).toBe(normalize(expected));
    });

    it('Use case 3: wraps each block with range + indices and absolute token paths', () => {
        const hbs = `
      <tbody>
        {{#each items}}
        <tr>
          <td>{{name}}</td>
          <td>{{quantity}}</td>
          <td>{{price}}</td>
          <td>{{amount}}</td>
        </tr>
        {{/each}}
      </tbody>
    `;

        const html = hbsToAnnotatedHtml(hbs, data);

        const expectedHtml = `<tbody><div data-hbs-each="items" data-hbs-range="0-1">
        <tr>
        <td><span data-hbs="{{items.0.name}}" class="hbs-token">Premium Wireless Headphones</span></td>
        <td><span data-hbs="{{items.0.quantity}}" class="hbs-token">1</span></td>
        <td><span data-hbs="{{items.0.price}}" class="hbs-token">$149.99</span></td>
        <td><span data-hbs="{{items.0.amount}}" class="hbs-token">$149.99</span></td>
        </tr>
        <tr>
        <td><span data-hbs="{{items.1.name}}" class="hbs-token">Smartphone Protective Case</span></td>
        <td><span data-hbs="{{items.1.quantity}}" class="hbs-token">2</span></td>
        <td><span data-hbs="{{items.1.price}}" class="hbs-token">$24.99</span></td>
        <td><span data-hbs="{{items.1.amount}}" class="hbs-token">$49.98</span></td>
        </tr>
        </div></tbody>`

        // Wrapper expectations
        expect(normalize(html)).toEqual(normalize(expectedHtml));
    });

    it('Use case 4: wraps each block with range + indices in case of simple array of strings', () => {
        const hbs = `
          <tbody>
            {{#each simpleArray}}
            <tr>
              <td>{{this}}</td>
            </tr>
            {{/each}}
          </tbody>
        `;

        const html = hbsToAnnotatedHtml(hbs, data);

        const expectedHtml = `<tbody><div data-hbs-each="simpleArray" data-hbs-range="0-1">
        <tr>
        <td><span data-hbs="{{simpleArray.0}}" class="hbs-token">Premium Wireless Headphones</span></td>
        </tr>
        <tr>
        <td><span data-hbs="{{simpleArray.1}}" class="hbs-token">Smartphone Protective Case</span></td>
        </tr>
        </div></tbody>`

        // Wrapper expectations
        expect(normalize(html)).toEqual(normalize(expectedHtml));
    });

    it('Each block should be handled with its child structure', () => {

        const hbs = ` {{#each items}} <div class="item">
        <h3>{{name}}</h3>
        <p>{{quantity}}</p>
        </div> {{/each}} `;

        const expectedAnnotatedHtml = `<div data-hbs-each="items" data-hbs-range="0-1">
        <div class="item">
        <h3><span data-hbs="{{items.0.name}}" class="hbs-token">Premium Wireless Headphones</span></h3>
        <p><span data-hbs="{{items.0.quantity}}" class="hbs-token">1</span></p>
        </div>
        <div class="item">
        <h3><span data-hbs="{{items.1.name}}" class="hbs-token">Smartphone Protective Case</span></h3>
        <p><span data-hbs="{{items.1.quantity}}" class="hbs-token">2</span></p>
        </div>
        </div>`;
        const actualAnnotatedHtml = hbsToAnnotatedHtml(hbs, data);
        

        expect(normalize(actualAnnotatedHtml)).toEqual(normalize(expectedAnnotatedHtml));
    });

    it("Use case 6: handles nested #each blocks correctly with absolute paths", () => {
      const hbs = `
        <div class="categories">
          {{#each categories}}
            <h2>{{title}}</h2>
            <ul>
              {{#each items}}
                <li>{{name}} - {{price}}</li>
              {{/each}}
            </ul>
          {{/each}}
        </div>
      `;
    
      const html = hbsToAnnotatedHtml(hbs, data);
    
      const expectedHtml = `
        <div class="categories">
          <div data-hbs-each="categories" data-hbs-range="0-1">
            <h2><span data-hbs="{{categories.0.title}}" class="hbs-token">Electronics</span></h2>
            <ul>
              <div data-hbs-each="categories.0.items" data-hbs-range="0-1">
                <li>
                  <span data-hbs="{{categories.0.items.0.name}}" class="hbs-token">Laptop</span> - 
                  <span data-hbs="{{categories.0.items.0.price}}" class="hbs-token">$999</span>
                </li>
                <li>
                  <span data-hbs="{{categories.0.items.1.name}}" class="hbs-token">Headphones</span> - 
                  <span data-hbs="{{categories.0.items.1.price}}" class="hbs-token">$199</span>
                </li>
              </div>
            </ul>
    
            <h2><span data-hbs="{{categories.1.title}}" class="hbs-token">Accessories</span></h2>
            <ul>
              <div data-hbs-each="categories.1.items" data-hbs-range="0-1">
                <li>
                  <span data-hbs="{{categories.1.items.0.name}}" class="hbs-token">Mouse</span> - 
                  <span data-hbs="{{categories.1.items.0.price}}" class="hbs-token">$49</span>
                </li>
                <li>
                  <span data-hbs="{{categories.1.items.1.name}}" class="hbs-token">Keyboard</span> - 
                  <span data-hbs="{{categories.1.items.1.price}}" class="hbs-token">$89</span>
                </li>
              </div>
            </ul>
          </div>
        </div>
      `;
    
      expect(normalize(html)).toEqual(normalize(expectedHtml));
    });
    
});


describe('annotatedHtmlToHbs (annotated HTML ➜ HBS)', () => {
    it('converts a single token span back to {{…}}', () => {
        const annotated =
            `<div class="receipt-title">` +
            `<span data-hbs="{{receiptTitle}}" class="hbs-token">Sales Receipt</span>` +
            `</div>`;
        const hbs = annotatedHtmlToHbs(annotated);
        expect(normalize(hbs)).toBe(normalize(`<div class="receipt-title">{{receiptTitle}}</div>`));
    });

    it('converts an each wrapper back to {{#each …}}…{{/each}} and preserves absolute inner paths', () => {
        const annotatedHtml = `<tbody><div data-hbs-each="items" data-hbs-range="0-1">
        <tr>
        <td><span data-hbs="{{items.0.name}}" class="hbs-token">Premium Wireless Headphones</span></td>
        <td><span data-hbs="{{items.0.quantity}}" class="hbs-token">1</span></td>
        <td><span data-hbs="{{items.0.price}}" class="hbs-token">$149.99</span></td>
        <td><span data-hbs="{{items.0.amount}}" class="hbs-token">$149.99</span></td>
        </tr>
        <tr>
        <td><span data-hbs="{{items.1.name}}" class="hbs-token">Smartphone Protective Case</span></td>
        <td><span data-hbs="{{items.1.quantity}}" class="hbs-token">2</span></td>
        <td><span data-hbs="{{items.1.price}}" class="hbs-token">$24.99</span></td>
        <td><span data-hbs="{{items.1.amount}}" class="hbs-token">$49.98</span></td>
        </tr>
        </div></tbody>`

        const expectedHBS = `
        <tbody>
          {{#each items}}
          <tr>
            <td>{{name}}</td>
            <td>{{quantity}}</td>
            <td>{{price}}</td>
            <td>{{amount}}</td>
          </tr>
          {{/each}}
        </tbody>
      `;

        const hbs = annotatedHtmlToHbs(annotatedHtml);

        expect(normalize(hbs)).toEqual(normalize(expectedHBS));
    });

    it('converts an each wrapper back to {{#each …}}…{{/each}} in case of simple array of strings', () => {
        const annotatedHtml = `<div data-hbs-each="simpleArray" data-hbs-range="0-1">
        <td><span class="hbs-token" data-hbs="{{simpleArray.0}}" >Premium Wireless Headphones</span></td>
        <td><span class="hbs-token" data-hbs="{{simpleArray.1}}" >Smartphone Protective Case</span></td>
        </div>`;

        const hbs = annotatedHtmlToHbs(annotatedHtml);
        const expectedHBS = `
        {{#each simpleArray}}
          <td>{{this}}</td>
        {{/each}}
      `

        expect(normalize(hbs)).toEqual(normalize(expectedHBS));
    });

    it('round-trip is lossless for simple nested variables', () => {
        const expectedhbs = `<div class="company-name">{{company.name}}</div>`;
        const annotatedHtml = `<div class="company-name"><span data-hbs="{{company.name}}" class="hbs-token">Acme Retail Solutions</span></div>`;
        const hbs = annotatedHtmlToHbs(annotatedHtml);
        expect(normalize(hbs)).toBe(normalize(expectedhbs));
    });

    it('handles non-table HTML structures generically', () => {
        const annotatedHtml = `<div data-hbs-each="items" data-hbs-range="0-1">
        <div class="item">
        <h3><span data-hbs="{{items.0.name}}" class="hbs-token">Item 1</span></h3>
        <p><span data-hbs="{{items.0.description}}" class="hbs-token">Description 1</span></p>
        </div>
        <div class="item">
        <h3><span data-hbs="{{items.1.name}}" class="hbs-token">Item 2</span></h3>
        <p><span data-hbs="{{items.1.description}}" class="hbs-token">Description 2</span></p>
        </div>
        </div>`;

        const hbs = annotatedHtmlToHbs(annotatedHtml);
        const expectedHBS = ` {{#each items}} <div class="item">
        <h3>{{name}}</h3>
        <p>{{description}}</p>
        </div> {{/each}} `;

        expect(normalize(hbs)).toEqual(normalize(expectedHBS));
    });

    it('handles list structures generically', () => {
        const annotatedHtml = `<ul data-hbs-each="items" data-hbs-range="0-1">
        <li class="list-item">
        <span data-hbs="{{items.0.name}}" class="hbs-token">Item 1</span>
        </li>
        <li class="list-item">
        <span data-hbs="{{items.1.name}}" class="hbs-token">Item 2</span>
        </li>
        </ul>`;

        const hbs = annotatedHtmlToHbs(annotatedHtml);
        const expectedHBS = ` {{#each items}} <li class="list-item">
        {{name}}
        </li> {{/each}} `;

        expect(normalize(hbs)).toEqual(normalize(expectedHBS));
    });

    it("converts nested each wrappers back to nested {{#each}} blocks correctly", () => {
      const annotatedHtml = `
        <div class="categories">
          <div data-hbs-each="categories" data-hbs-range="0-1">
            <h2><span data-hbs="{{categories.0.title}}" class="hbs-token">Electronics</span></h2>
            <ul>
              <div data-hbs-each="categories.0.items" data-hbs-range="0-1">
                <li>
                  <span data-hbs="{{categories.0.items.0.name}}" class="hbs-token">Laptop</span> - 
                  <span data-hbs="{{categories.0.items.0.price}}" class="hbs-token">$999</span>
                </li>
                <li>
                  <span data-hbs="{{categories.0.items.1.name}}" class="hbs-token">Headphones</span> - 
                  <span data-hbs="{{categories.0.items.1.price}}" class="hbs-token">$199</span>
                </li>
              </div>
            </ul>
          </div>
        </div>
      `;
    
      const expectedHbs = `
        <div class="categories">
          {{#each categories}}
            <h2>{{title}}</h2>
            <ul>
              {{#each items}}
                <li>{{name}} - {{price}}</li>
              {{/each}}
            </ul>
          {{/each}}
        </div>
      `;
    
      const hbs = annotatedHtmlToHbs(annotatedHtml);
      expect(normalize(hbs)).toEqual(normalize(expectedHbs));
    });
    
});