export default (name) => {
  return name.toString().toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/\-/g, "_")
    .replace(/[^\w\_]+/g, "_")
    .replace(/\_\_+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
};
