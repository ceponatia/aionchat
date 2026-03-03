declare module "*.css";
declare module "*.scss";
declare module "*.sass";
declare module "*.less";

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.scss" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.sass" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.less" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
