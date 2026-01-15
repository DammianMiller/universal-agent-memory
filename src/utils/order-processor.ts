import { z } from 'zod';
import { AppError } from './validate-json.js';

/**
 * Supported order types.
 */
export enum OrderType {
  DIGITAL = 'digital',
  PHYSICAL = 'physical',
  SUBSCRIPTION = 'subscription',
}

/**
 * Supported order statuses.
 */
export enum OrderStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  SHIPPED = 'shipped',
  ACTIVE = 'active',
}

/**
 * Order item definition.
 */
export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

/**
 * Order definition.
 */
export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  customerId: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result returned after processing an order.
 */
export interface OrderProcessingResult {
  order: Order;
  message: string;
}

/**
 * Runtime validation schema for orders.
 */
const OrderSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
  type: z.nativeEnum(OrderType),
  status: z.nativeEnum(OrderStatus),
  customerId: z.string().min(1, 'Customer ID is required'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().positive('Quantity must be positive'),
      price: z.number().positive('Price must be positive'),
    })
  ).min(1, 'At least one item is required'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Strategy interface for processing orders.
 */
export interface OrderProcessingStrategy {
  /**
   * Determines if the strategy can handle the given order.
   * @param order - The order to evaluate
   * @returns True if the strategy can handle the order
   */
  canHandle(order: Order): boolean;

  /**
   * Process the order and return the updated order state.
   * @param order - The order to process
   * @returns The processed order and a message
   */
  process(order: Order): Promise<OrderProcessingResult>;
}

/**
 * Shared helper for updating order status.
 * @param order - The order to update
 * @param status - The new status to apply
 * @returns The updated order instance
 */
function updateOrderStatus(order: Order, status: OrderStatus): Order {
  return {
    ...order,
    status,
    updatedAt: new Date(),
  };
}

/**
 * Strategy for digital orders.
 */
export class DigitalOrderStrategy implements OrderProcessingStrategy {
  /**
   * Determines if the strategy can handle the given order.
   * @param order - The order to evaluate
   * @returns True if the order is a pending digital order
   */
  canHandle(order: Order): boolean {
    return order.type === OrderType.DIGITAL && order.status === OrderStatus.PENDING;
  }

  /**
   * Process a digital order by sending a download link.
   * @param order - The order to process
   * @returns The processed order and a message
   */
  async process(order: Order): Promise<OrderProcessingResult> {
    await this.sendDownloadLink(order);

    const processedOrder = updateOrderStatus(order, OrderStatus.DELIVERED);

    return {
      order: processedOrder,
      message: `Digital order ${processedOrder.id} delivered via email`,
    };
  }

  /**
   * Send a download link email for the order.
   * @param order - The order to deliver
   * @returns A promise that resolves when the email has been sent
   */
  private async sendDownloadLink(order: Order): Promise<void> {
    console.log(`Sending email with download link for order ${order.id}`);
  }
}

/**
 * Strategy for physical orders.
 */
export class PhysicalOrderStrategy implements OrderProcessingStrategy {
  /**
   * Determines if the strategy can handle the given order.
   * @param order - The order to evaluate
   * @returns True if the order is a pending physical order
   */
  canHandle(order: Order): boolean {
    return order.type === OrderType.PHYSICAL && order.status === OrderStatus.PENDING;
  }

  /**
   * Process a physical order by creating a shipping label.
   * @param order - The order to process
   * @returns The processed order and a message
   */
  async process(order: Order): Promise<OrderProcessingResult> {
    await this.createShippingLabel(order);

    const processedOrder = updateOrderStatus(order, OrderStatus.SHIPPED);

    return {
      order: processedOrder,
      message: `Physical order ${processedOrder.id} shipped`,
    };
  }

  /**
   * Create a shipping label for the order.
   * @param order - The order to ship
   * @returns A promise that resolves when the label is created
   */
  private async createShippingLabel(order: Order): Promise<void> {
    console.log(`Creating shipping label for order ${order.id}`);
  }
}

/**
 * Strategy for subscription orders.
 */
export class SubscriptionOrderStrategy implements OrderProcessingStrategy {
  /**
   * Determines if the strategy can handle the given order.
   * @param order - The order to evaluate
   * @returns True if the order is a pending subscription order
   */
  canHandle(order: Order): boolean {
    return order.type === OrderType.SUBSCRIPTION && order.status === OrderStatus.PENDING;
  }

  /**
   * Process a subscription order by activating the subscription.
   * @param order - The order to process
   * @returns The processed order and a message
   */
  async process(order: Order): Promise<OrderProcessingResult> {
    await this.activateSubscription(order);

    const processedOrder = updateOrderStatus(order, OrderStatus.ACTIVE);

    return {
      order: processedOrder,
      message: `Subscription order ${processedOrder.id} activated`,
    };
  }

  /**
   * Activate the subscription for the order.
   * @param order - The order to activate
   * @returns A promise that resolves when activation completes
   */
  private async activateSubscription(order: Order): Promise<void> {
    console.log(`Activating subscription for order ${order.id}`);
  }
}

/**
 * Coordinates order processing using registered strategies.
 */
export class OrderProcessingService {
  private readonly strategies: OrderProcessingStrategy[];

  /**
   * Create a new service instance.
   * @param strategies - Optional custom strategies to register
   */
  constructor(strategies?: OrderProcessingStrategy[]) {
    this.strategies = strategies ?? [
      new DigitalOrderStrategy(),
      new PhysicalOrderStrategy(),
      new SubscriptionOrderStrategy(),
    ];
  }

  /**
   * Process an order input using the first matching strategy.
   * @param orderInput - The unvalidated order input
   * @returns The processed order and a message
   */
  async processOrder(orderInput: unknown): Promise<OrderProcessingResult> {
    const order = this.parseOrder(orderInput);

    const strategy = this.strategies.find((candidate) => candidate.canHandle(order));
    if (!strategy) {
      throw new AppError(
        `No strategy registered for order type ${order.type}`,
        'UNSUPPORTED_ORDER_TYPE',
        { orderId: order.id, orderType: order.type }
      );
    }

    try {
      return await strategy.process(order);
    } catch (error) {
      throw new AppError(
        'Order processing failed',
        'ORDER_PROCESSING_FAILED',
        {
          orderId: order.id,
          orderType: order.type,
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Validate and parse order input.
   * @param orderInput - The unvalidated order input
   * @returns The validated order
   */
  private parseOrder(orderInput: unknown): Order {
    const result = OrderSchema.safeParse(orderInput);
    if (!result.success) {
      throw new AppError(
        'Order validation failed',
        'INVALID_ORDER',
        { errors: result.error.errors }
      );
    }

    return result.data;
  }
}
