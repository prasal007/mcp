#!/usr/bin/env node 
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ProductService } from "../services/ProductService.js";
const server = new McpServer({
    name: "ecommerce-custom-mcp",
    version: "1.0.0"
});
const svc = new ProductService();
const ProductSchema = z.object({
    id: z.number().int().positive().optional(),
    sku: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    price: z.union([z.string(), z.number()]),
    quantity: z.number().int(),
    created_at: z.union([z.string(), z.date()]).optional(),
    updated_at: z.union([z.string(), z.date()]).optional()
});
const ProductCreateInput = z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    price: z.coerce.number().nonnegative(),
    quantity: z.coerce.number().int().nonnegative(),
});
//Tooling + AI assitance = Sampling
server.registerTool("add_product", {
    title: "Add Product",
    description: "Create a new product with sku, name, (optional) description, price, and quantity.",
    inputSchema: {
        sku: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional().nullable(),
        price: z.number().nonnegative(),
        quantity: z.number().int().nonnegative(),
    },
    outputSchema: ProductSchema.shape
}, async ({ sku, name, description, price, quantity }) => {
    const created = await svc.addProduct({ sku, name, description, price, quantity });
    return {
        content: [{ type: "text", text: JSON.stringify(created) }],
        structuredContent: created,
    };
});
//Prompt
server.registerPrompt("generate-product-description-template", {
    title: "Generate Product desc template",
    description: "create a compelling description for ecommerce products",
    argsSchema: {
        productName: z.string().describe("Name of the product"),
        features: z.string().optional().describe("key features of the product"),
        targetAudience: z.string().optional().describe("demographics")
    }
}, ({ productName, features, targetAudience }) => ({
    messages: [
        {
            role: "user",
            content: {
                type: "text",
                text: `Generate a compelling e-commerce product description for: ${productName}

  ${features ? `Key Features:\n${features}` : ""}
${targetAudience ? `Target Audience: ${targetAudience}` : ""}

Please create:
1. A catchy headline (5-8 words)
2. A detailed description (2-3 paragraphs)
3. 3-5 bullet points highlighting key benefits
4. A call-to-action

Make it engaging, SEO-friendly, and persuasive.`
            }
        }
    ]
}));
//sampling
server.registerTool("add_product_smart", {
    title: "Add Product (Smart AI Enhanced)",
    description: "Create a new product with smart ai generated description if missing",
    inputSchema: ProductCreateInput.shape,
    outputSchema: ProductSchema.shape,
}, async (raw) => {
    const args = ProductCreateInput.parse(raw);
    let finalDescription = args.description;
    if (!finalDescription) {
        const aiprompt = `write a 2-3 sentences product description for ${args.name} price is ${args.price}`;
        //Request AI to generate description
        const response = await server.server.createMessage({
            messages: [
                {
                    role: "user",
                    content: { type: "text", text: aiprompt }
                }
            ],
            maxTokens: 100
        }); //AI help
        finalDescription = response.content.text;
    }
    ;
    const created = await svc.addProduct({
        ...args,
        description: finalDescription
    });
    return {
        content: [{ type: "text", text: JSON.stringify(created) }],
        structuredContent: created,
    };
});
server.registerTool("get_product_by_id", {
    title: "Get Product by ID",
    description: "Fetch a single product by numeric ID",
    inputSchema: {
        id: z.number().int().positive()
    },
    outputSchema: ProductSchema.shape
}, async ({ id }) => {
    const product = await svc.getProductById(id);
    if (!product) {
        return {
            content: [{ type: "text", text: `product ${id} not found` }],
            isError: true,
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify(product) }],
        structuredContent: product
    };
});
server.registerTool("delete_product", {
    title: "Delete Product",
    description: "Delete a product by id. Returns { deleted: boolean }.",
    inputSchema: {
        id: z.number().int().positive()
    },
    outputSchema: {
        deleted: z.boolean()
    },
}, async ({ id }) => {
    const ok = await svc.deleteProduct(id);
    return {
        content: [{ type: "text", text: JSON.stringify({ deleted: ok }) }],
        structuredContent: { deleted: ok },
    };
});
server.registerResource("products-catalog", "products://catalog", {
    description: "Browse all products in the catalog"
}, async (uri) => {
    const products = await svc.listProducts(200, 0);
    return {
        contents: [{ uri: uri.href, type: "text", text: JSON.stringify(products) }]
    };
});
//assignment <5
server.registerResource("low-stock-products", "products://low-stock", {
    description: "List products with low inventory (quantity < 5)",
}, async (uri) => {
    const allProducts = await svc.listProducts(200, 0); // Get up to 200 products
    const lowStock = allProducts.filter(p => p.quantity < 5);
    return {
        contents: [{ uri: uri.href, type: "text", text: JSON.stringify(lowStock) }]
    };
});
// Start stdio transport
(async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
})();
