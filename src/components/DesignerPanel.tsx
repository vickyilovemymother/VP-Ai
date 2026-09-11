import React, { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, MoveUp, MoveDown, Layers, Image as ImageIcon, Palette, Type, Grid, Key, RotateCw, RefreshCw, Sparkles } from 'lucide-react';
import { Layer, LayerCategory, Graphic, Pattern, Material } from '../types';

interface DesignerPanelProps {
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  selectedLayerId: string | null;
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string | null>>;
}

declare global {
  interface Window {
    aistudio?: {
      openSelectKey?: () => Promise<void>;
      hasSelectedApiKey?: () => Promise<boolean>;
    };
  }
}

export const DesignerPanel: React.FC<DesignerPanelProps> = ({
  layers,
  setLayers,
  selectedLayerId,
  setSelectedLayerId,
}) => {
  const [newLayerCategory, setNewLayerCategory] = useState<LayerCategory>('top');

  const handleAddLayer = () => {
    const typeMap: Record<LayerCategory, Layer['type']> = {
      top: 'garment',
      bottom: 'garment',
      outerwear: 'garment',
      dress: 'garment',
      shoes: 'footwear',
      cap: 'headwear',
      accessory: 'accessory'
    };

    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: `New ${newLayerCategory}`,
      type: typeMap[newLayerCategory],
      category: newLayerCategory,
      visible: true,
      zIndex: layers.length,
      material: {},
      graphics: [],
      prompt: '',
      promptStrength: 0.8,
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleDeleteLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const handleToggleVisibility = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const handleMoveLayer = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newLayers = [...layers];
      [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
      setLayers(newLayers);
    } else if (direction === 'down' && index < layers.length - 1) {
      const newLayers = [...layers];
      [newLayers[index + 1], newLayers[index]] = [newLayers[index], newLayers[index + 1]];
      setLayers(newLayers);
    }
  };

  const updateSelectedLayer = (updates: Partial<Layer>) => {
    setLayers(layers.map(l => l.id === selectedLayerId ? { ...l, ...updates } : l));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Layer Manager */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers size={16} /> Layer Manager
            </h3>
            {process.env.API_KEY && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-accent/10 border border-brand-accent/20 rounded-full">
                <div className="w-1 h-1 rounded-full bg-brand-accent animate-pulse" />
                <span className="text-[8px] font-bold text-gradient uppercase tracking-tighter">HQ Mode</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <select
              className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
              value={newLayerCategory}
              onChange={(e) => setNewLayerCategory(e.target.value as LayerCategory)}
            >
              <option value="top">Top Wear</option>
              <option value="bottom">Bottom Wear</option>
              <option value="outerwear">Outerwear</option>
              <option value="dress">Full Dress</option>
              <option value="shoes">Footwear / Shoes</option>
              <option value="cap">Headwear / Cap</option>
              <option value="accessory">Accessory (Watch/Chain)</option>
            </select>
            <button
              onClick={handleAddLayer}
              className="bg-brand-accent text-black p-1 rounded-lg hover:bg-brand-accent/80 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                selectedLayerId === layer.id
                  ? 'bg-white/10 border-brand-accent/50'
                  : 'bg-black/20 border-white/5 hover:bg-white/5'
              }`}
              onClick={() => setSelectedLayerId(layer.id)}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleVisibility(layer.id); }}
                  className="text-white/40 hover:text-white"
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <span className="text-sm text-white">{layer.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveLayer(index, 'up'); }}
                  disabled={index === 0}
                  className="p-1 text-white/40 hover:text-white disabled:opacity-30"
                >
                  <MoveUp size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveLayer(index, 'down'); }}
                  disabled={index === layers.length - 1}
                  className="p-1 text-white/40 hover:text-white disabled:opacity-30"
                >
                  <MoveDown size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer.id); }}
                  className="p-1 text-red-400/60 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {layers.length === 0 && (
            <div className="text-center py-4 text-xs text-white/40 border border-dashed border-white/10 rounded-lg">
              No layers added. Add a layer to start designing.
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Controls */}
      {selectedLayer && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-2 mb-2 flex items-center justify-between">
            <span>Editing: {selectedLayer.name}</span>
            {!process.env.API_KEY && (
              <button 
                onClick={() => window.aistudio?.openSelectKey?.()}
                className="text-[9px] text-brand-accent hover:underline flex items-center gap-1"
              >
                <Key size={10} /> Upgrade to HQ
              </button>
            )}
          </h3>

          {/* Material */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-white/60 flex items-center gap-2">
              <Palette size={14} /> Material (Color / Fabric)
            </label>
            <p className="text-[10px] text-white/30 -mt-1">Color changes preserve original fabric shadows and folds.</p>
            <div className="flex gap-2">
              <input
                type="color"
                value={selectedLayer.material.colorHex || '#ffffff'}
                onChange={(e) => updateSelectedLayer({ material: { ...selectedLayer.material, colorHex: e.target.value } })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
              />
              <div className="flex-1 relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, (base64) => updateSelectedLayer({ material: { ...selectedLayer.material, fabricImage: base64 } }))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-8 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center text-xs text-white/60 hover:bg-white/5 transition-colors overflow-hidden">
                  {selectedLayer.material.fabricImage ? (
                    <div className="flex items-center gap-2 w-full px-2">
                      <img src={selectedLayer.material.fabricImage} alt="Fabric" className="w-5 h-5 object-cover rounded" />
                      <span className="truncate">Fabric Uploaded</span>
                    </div>
                  ) : 'Upload Fabric Texture'}
                </div>
              </div>
            </div>
            {selectedLayer.material.fabricImage && (
              <div className="flex flex-col gap-2 mt-1 bg-black/20 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-12">Scale:</span>
                  <input
                    type="range"
                    min="0.1" max="3" step="0.1"
                    value={selectedLayer.material.textureScale || 1}
                    onChange={(e) => updateSelectedLayer({ material: { ...selectedLayer.material, textureScale: parseFloat(e.target.value) } })}
                    className="flex-1 h-1"
                  />
                  <span className="text-[10px] text-white/60 w-6">{(selectedLayer.material.textureScale || 1).toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-12 flex items-center gap-1">
                    <RotateCw size={10} /> Rot:
                  </span>
                  <input
                    type="range"
                    min="0" max="360" step="1"
                    value={selectedLayer.material.rotation || 0}
                    onChange={(e) => updateSelectedLayer({ material: { ...selectedLayer.material, rotation: parseInt(e.target.value) } })}
                    className="flex-1 h-1"
                  />
                  <span className="text-[10px] text-white/60 w-6">{selectedLayer.material.rotation || 0}°</span>
                </div>
              </div>
            )}
          </div>

          {/* Graphics / Logos */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-white/60 flex items-center gap-2">
              <ImageIcon size={14} /> Graphics / Logos
            </label>
            <p className="text-[10px] text-white/30 -mt-1">Logos replace existing ones and follow garment curves.</p>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, (base64) => {
                  const newGraphic: Graphic = {
                    id: `graphic_${Date.now()}`,
                    image: base64,
                    placement: 'center',
                    x: 0, y: 0, scale: 1, rotation: 0
                  };
                  updateSelectedLayer({ graphics: [...selectedLayer.graphics, newGraphic] });
                })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-8 bg-black/50 border border-dashed border-white/20 rounded-lg flex items-center justify-center text-xs text-white/60 hover:bg-white/5 transition-colors">
                + Add Graphic
              </div>
            </div>
            {selectedLayer.graphics.map((graphic, gIndex) => (
              <div key={graphic.id} className="bg-black/30 p-2 rounded-lg border border-white/5 mt-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/60">Graphic {gIndex + 1}</span>
                  <button
                    onClick={() => updateSelectedLayer({ graphics: selectedLayer.graphics.filter(g => g.id !== graphic.id) })}
                    className="text-red-400/60 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    <img src={graphic.image} alt="Graphic" className="w-full h-full object-contain bg-white/10 rounded" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, (base64) => {
                        const newGraphics = [...selectedLayer.graphics];
                        newGraphics[gIndex].image = base64;
                        updateSelectedLayer({ graphics: newGraphics });
                      })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Replace Logo"
                    />
                    <div className="absolute -top-1 -right-1 bg-brand-accent text-black rounded-full p-0.5 pointer-events-none">
                      <RefreshCw size={8} />
                    </div>
                  </div>
                  <select
                    className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-[10px] text-white"
                    value={graphic.placement}
                    onChange={(e) => {
                      const newGraphics = [...selectedLayer.graphics];
                      newGraphics[gIndex].placement = e.target.value as any;
                      updateSelectedLayer({ graphics: newGraphics });
                    }}
                  >
                    <option value="center">Center</option>
                    <option value="left_chest">Left Chest</option>
                    <option value="sleeve">Sleeve</option>
                    <option value="back">Back</option>
                    <option value="manual">Manual (x,y)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 px-1">
                  {graphic.placement === 'manual' && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/40 w-8">X:</span>
                        <input
                          type="range" min="-100" max="100" step="1"
                          value={graphic.x}
                          onChange={(e) => {
                            const newGraphics = [...selectedLayer.graphics];
                            newGraphics[gIndex].x = parseInt(e.target.value);
                            updateSelectedLayer({ graphics: newGraphics });
                          }}
                          className="flex-1 h-1"
                        />
                        <span className="text-[9px] text-white/60 w-6">{graphic.x}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/40 w-8">Y:</span>
                        <input
                          type="range" min="-100" max="100" step="1"
                          value={graphic.y}
                          onChange={(e) => {
                            const newGraphics = [...selectedLayer.graphics];
                            newGraphics[gIndex].y = parseInt(e.target.value);
                            updateSelectedLayer({ graphics: newGraphics });
                          }}
                          className="flex-1 h-1"
                        />
                        <span className="text-[9px] text-white/60 w-6">{graphic.y}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/40 w-8">Size:</span>
                    <input
                      type="range" min="0.1" max="2" step="0.1"
                      value={graphic.scale}
                      onChange={(e) => {
                        const newGraphics = [...selectedLayer.graphics];
                        newGraphics[gIndex].scale = parseFloat(e.target.value);
                        updateSelectedLayer({ graphics: newGraphics });
                      }}
                      className="flex-1 h-1"
                    />
                    <span className="text-[9px] text-white/60 w-6">{graphic.scale.toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/40 w-8 flex items-center gap-1">
                      <RotateCw size={10} /> Rot:
                    </span>
                    <input
                      type="range" min="0" max="360" step="1"
                      value={graphic.rotation || 0}
                      onChange={(e) => {
                        const newGraphics = [...selectedLayer.graphics];
                        newGraphics[gIndex].rotation = parseInt(e.target.value);
                        updateSelectedLayer({ graphics: newGraphics });
                      }}
                      className="flex-1 h-1"
                    />
                    <span className="text-[9px] text-white/60 w-6">{graphic.rotation || 0}°</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pattern (All-over print) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-white/60 flex items-center gap-2">
              <Grid size={14} /> All-over Print Pattern
            </label>
            <p className="text-[10px] text-white/30 -mt-1">Seamless prints follow garment contours and folds.</p>
            {!selectedLayer.pattern ? (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, (base64) => {
                    updateSelectedLayer({ pattern: { image: base64, scale: 1, rotation: 0, offsetX: 0, offsetY: 0, repeat: 'tile' } });
                  })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-8 bg-black/50 border border-dashed border-white/20 rounded-lg flex items-center justify-center text-xs text-white/60 hover:bg-white/5 transition-colors">
                  + Upload Pattern
                </div>
              </div>
            ) : (
              <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/60">Pattern Active</span>
                  <button
                    onClick={() => updateSelectedLayer({ pattern: undefined })}
                    className="text-red-400/60 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    <img src={selectedLayer.pattern.image} alt="Pattern" className="w-full h-full object-cover bg-white/10 rounded" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, (base64) => {
                        updateSelectedLayer({ pattern: { ...selectedLayer.pattern!, image: base64 } });
                      })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Replace Pattern"
                    />
                    <div className="absolute -top-1 -right-1 bg-brand-accent text-black rounded-full p-0.5 pointer-events-none">
                      <RefreshCw size={8} />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 w-12">Scale:</span>
                      <input
                        type="range" min="0.1" max="3" step="0.1"
                        value={selectedLayer.pattern.scale}
                        onChange={(e) => updateSelectedLayer({ pattern: { ...selectedLayer.pattern!, scale: parseFloat(e.target.value) } })}
                        className="flex-1 h-1"
                      />
                      <span className="text-[10px] text-white/60 w-6">{selectedLayer.pattern.scale.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 w-12 flex items-center gap-1">
                        <RotateCw size={10} /> Rot:
                      </span>
                      <input
                        type="range" min="0" max="360" step="1"
                        value={selectedLayer.pattern.rotation || 0}
                        onChange={(e) => updateSelectedLayer({ pattern: { ...selectedLayer.pattern!, rotation: parseInt(e.target.value) } })}
                        className="flex-1 h-1"
                      />
                      <span className="text-[10px] text-white/60 w-6">{selectedLayer.pattern.rotation || 0}°</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Prompt */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-white/60 flex items-center gap-2">
              <Sparkles size={14} className="text-brand-accent" /> AI Prompt (Layer Specific)
            </label>
            <textarea
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-accent/50 min-h-[80px]"
              placeholder={`Describe specific details for this ${selectedLayer.category} (e.g., 'distressed denim texture', 'silk finish', 'gold embroidery')...`}
              value={selectedLayer.prompt}
              onChange={(e) => updateSelectedLayer({ prompt: e.target.value })}
            />
            <div className="flex items-center gap-3 px-1">
              <span className="text-[10px] text-white/40">AI Strength:</span>
              <input
                type="range" min="0" max="1" step="0.1"
                value={selectedLayer.promptStrength}
                onChange={(e) => updateSelectedLayer({ promptStrength: parseFloat(e.target.value) })}
                className="flex-1 h-1"
              />
              <span className="text-[10px] text-white/60 w-8">{selectedLayer.promptStrength.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
