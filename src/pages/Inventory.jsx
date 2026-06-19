const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Package, AlertTriangle, ArrowDown, ArrowUp, Search } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { Progress } from "@/components/ui/progress";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    db.entities.Product.list("stock").then(setProducts);
  }, []);

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
  const lowStock = products.filter((p) => p.stock <= (p.reorder_point || 10));
  const outOfStock = products.filter((p) => p.stock === 0);

  return (
    <div>
      <TopBar title="Inventory" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-sm text-muted-foreground mb-1">Total Products</div>
            <div className="text-2xl font-heading font-bold text-foreground">{products.length}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-sm text-muted-foreground mb-1">Total Stock</div>
            <div className="text-2xl font-heading font-bold text-foreground">{totalStock.toLocaleString()}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              Low Stock Alerts
            </div>
            <div className="text-2xl font-heading font-bold text-amber-600">{lowStock.length}</div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">SKU</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Price</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      Stock <ArrowUp size={12} />
                    </span>
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <Package size={32} className="mx-auto mb-2 opacity-30" />
                      No products found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const isLow = p.stock <= (p.reorder_point || 10);
                    const isOut = p.stock === 0;
                    const stockPercent = Math.min((p.stock / ((p.reorder_point || 10) * 5)) * 100, 100);

                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{p.name}</span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{p.sku || "—"}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                            {p.category || "Uncategorized"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-foreground">
                          ${(p.price || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`font-medium ${isOut ? "text-red-500" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                              {p.stock}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isOut ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}