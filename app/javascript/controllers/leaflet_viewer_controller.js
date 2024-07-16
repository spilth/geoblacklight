import { Icon, Control } from "leaflet";
import "leaflet-fullscreen";
import { layerGroup, polygon, geoJSON, map, tileLayer } from "leaflet";
import { Controller } from "@hotwired/stimulus";
import basemaps from "../leaflet/basemaps.js";
import LayerOpacityControl from "../leaflet/controls/layer_opacity.js";
import { wmsLayer } from "../leaflet/layers.js";
import { LatLngBounds } from "leaflet";

// base
// ├── map
// │   ├── esri
// │   │   ├── dynamic map
// │   │   ├── feature layer
// │   │   ├── image map
// │   │   ├── tiled map
// │   ├── index map
// │   ├── wms
// │   │   ├── wmts
// │   │   ├── xyz
// │   │   ├── tms
// │   │   ├── tilejson

export const geoJSONToBounds = (geojson) => {
  const layer = geoJSON(geojson);
  return layer.getBounds();
};

export const DEFAULT_BOUNDS = new LatLngBounds([
  [-30, -100],
  [30, 100],
]);

export const DEFAULT_OPACITY = 0.75;

export default class LeafletViewerController extends Controller {
  static values = {
    url: String,
    protocol: String,
    available: Boolean,
    options: Object,
    basemap: String,
    mapGeom: Object,
    layerId: String,
    drawInitialBounds: Boolean,
  };

  connect() {
    // Sets leaflet icon paths to ex. /assets/marker-icon-2x-rails-fingerprint
    Icon.Default.imagePath = "..";

    // Set up layers
    this.basemap = this.selectBasemap();
    this.overlay = layerGroup();

    // Calculate bounds
    this.bounds = DEFAULT_BOUNDS;
    if (this.hasMapGeomValue) this.bounds = geoJSONToBounds(this.mapGeomValue);

    // Load the map
    this.loadMap();
  }

  get config() {
    if (!this.optionsValue.VIEWERS) return {};
    return this.optionsValue.VIEWERS[this.protocolValue.toUpperCase()];
  }

  get detectRetina() {
    return this.optionsValue.LAYERS.DETECT_RETINA || false;
  }

  get controlNames() {
    return this.config.CONTROLS || [];
  }

  // Create the map, add layers, and fit the bounds
  loadMap() {
    this.map = map(this.element);
    this.map.addLayer(this.basemap);
    this.map.addLayer(this.overlay);
    this.map.fitBounds(this.bounds);

    // If the data is available, add the preview and controls
    // Otherwise just draw the bounds, if configured to do so
    if (this.availableValue) {
      this.addPreviewOverlay();
      if (this.previewOverlay) this.addControls();
    } else if (this.drawInitialBoundsValue && this.bounds) {
      this.addBoundsOverlay(this.bounds);
    }
  }

  // Select the configured basemap to use
  selectBasemap() {
    const basemapName = this.basemapValue || "Streets";
    return basemaps[basemapName]();
  }

  // Add the configured controls to the map
  addControls() {
    this.controlNames.forEach((controlName) => {
      if (controlName == "Opacity")
        return this.map.addControl(
          new LayerOpacityControl(this.previewOverlay)
        );
      if (controlName == "Fullscreen")
        return this.map.addControl(
          new Control.Fullscreen({ position: "topright" })
        );
      console.error(`Unsupported control name: "${controlName}"`);
    });
  }

  // Add the bounding box to the map
  addBoundsOverlay(bounds) {
    console.log("adding bounds", bounds);
    const boundsOverlay = polygon([
      bounds.getSouthWest(),
      bounds.getSouthEast(),
      bounds.getNorthEast(),
      bounds.getNorthWest(),
    ]);
    this.boundsOverlay = boundsOverlay;
    this.overlay.addLayer(boundsOverlay);
  }

  // Remove the bounding box overlay
  removeBoundsOverlay() {
    if (this.boundsOverlay) this.overlay.removeLayer(this.boundsOverlay);
  }

  // Add the actual data to the map as a layer
  async addPreviewOverlay() {
    this.previewOverlay = await this.getPreviewOverlay();
    this.overlay.addLayer(this.previewOverlay);
  }

  // Generate a layer based on the protocol
  async getPreviewOverlay() {
    const url = this.urlValue;
    const options = {
      layerId: this.layerIdValue,
      opacity: this.optionsValue.opacity,
      detectRetina: this.detectRetina,
    };

    if (this.protocolValue == "EsriDynamicMap") return null; // TODO
    if (this.protocolValue == "EsriFeatureLayer") return null; // TODO
    if (this.protocolValue == "EsriImageMap") return null; // TODO
    if (this.protocolValue == "EsriTiledMap") return null; // TODO
    if (this.protocolValue == "IndexMap") return null; // TODO
    if (this.protocolValue == "Wms") return wmsLayer(url, options);
    if (this.protocolValue == "Wmts") return null; // TODO
    if (this.protocolValue == "Xyz") return tileLayer(url, options);
    if (this.protocolValue == "Tms")
      return tileLayer(url, { tms: true, ...options });
    if (this.protocolValue == "Tilejson") return null; // TODO
    console.error(`Unsupported protocol name: "${this.protocolValue}"`);
    return null;
  }
}
