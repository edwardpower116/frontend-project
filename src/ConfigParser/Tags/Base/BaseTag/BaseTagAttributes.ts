import { ConfigTreeNode } from 'src/ConfigParser/ConfigTree/ConfigTreeNode';
import { BaseTagController } from './BaseTagController';

const ATTRIBUTES = new WeakMap<ConfigTreeNode, Record<string, string>>();

type AnyController<Controller extends typeof BaseTagController> = unknown extends Controller ? never : Controller;

type AttributeConfig = {
  name: string,
  required?: boolean,
  default?: any,
}

const VALID_ATTRIBUTES = new WeakMap<typeof BaseTagController, AttributeConfig[]>();

export type AttributeParserName<T extends string> = `${T}Parser`;

export type AttributeParserParams = {
  value: string,
  name: string,
  node: ConfigTreeNode,
};

export type AttributeParser = (atribute: AttributeParserParams) => any;

export type AttributeParsers = Record<AttributeParserName<string>, AttributeParser>;

export abstract class BaseTagAttributes {
  parsers: AttributeParsers = {};

  private treeNode: ConfigTreeNode;

  constructor(treeNode: ConfigTreeNode) {
    this.treeNode = treeNode;
    this.grabAttributes();
    ATTRIBUTES.set(treeNode, {});
  }

  private grabAttributes() {
    const attributes = this.treeNode.node.attributes;
    const internalAttributes = ATTRIBUTES.get(this.treeNode);

    for (const attribute of attributes) {
      const name = attribute.name.toLowerCase();
      const { value } = attribute;

      const parser = this.parsers[`${name}Parser`];

      this.validateAttribute(name, value);

      Object.defineProperty(internalAttributes, name.toLowerCase(), {
        get() {
          return parser ? parser({
            value,
            name,
            node: this.treeNode,
          }) : value;
        },
      });
    }
  }

  private validateAttribute(name: string, value: string) {
    const controller = this.treeNode.controller.constructor as typeof BaseTagController;
    const attributes = VALID_ATTRIBUTES.get(controller);
    const attribute = attributes?.find((attr) => attr.name === name);

    if (attribute?.required && !value) {
      throw new Error(`Attribute ${name} is required for tag ${controller.type}`);
    }
  }
}

export function withAttributes(attributes: AttributeConfig[]) {
  return function<Controller extends typeof BaseTagController>(target: AnyController<Controller>) {
    VALID_ATTRIBUTES.set(target, attributes);
  };
}
