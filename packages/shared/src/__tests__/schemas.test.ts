import { describe, it, expect } from 'vitest';
import {
  registerBusinessSchema,
  loginSchema,
  createShopSchema,
  createOrderSchema,
  createProductSchema,
  createVisitSchema,
  createPaymentSchema,
  createEmployeeSchema,
} from '../schemas/index.js';

describe('Auth Schemas', () => {
  describe('registerBusinessSchema', () => {
    it('accepts valid registration input', () => {
      const input = {
        businessName: 'Test Corp',
        username: 'admin1',
        email: 'admin@test.com',
        password: 'securepass123',
      };
      expect(registerBusinessSchema.safeParse(input).success).toBe(true);
    });

    it('rejects short business name', () => {
      const input = {
        businessName: 'A',
        username: 'admin1',
        password: 'securepass123',
      };
      expect(registerBusinessSchema.safeParse(input).success).toBe(false);
    });

    it('rejects short password', () => {
      const input = {
        businessName: 'Test Corp',
        username: 'admin1',
        password: '123',
      };
      expect(registerBusinessSchema.safeParse(input).success).toBe(false);
    });

    it('rejects invalid email', () => {
      const input = {
        businessName: 'Test Corp',
        username: 'admin1',
        password: 'securepass123',
        email: 'not-an-email',
      };
      expect(registerBusinessSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login input', () => {
      const input = { username: 'admin1', password: 'securepass123' };
      expect(loginSchema.safeParse(input).success).toBe(true);
    });

    it('rejects empty username', () => {
      const input = { username: '', password: 'securepass123' };
      expect(loginSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('createEmployeeSchema', () => {
    it('accepts valid employee input', () => {
      const input = {
        username: 'salesman1',
        password: 'temppass123',
        phone: '9876543210',
      };
      expect(createEmployeeSchema.safeParse(input).success).toBe(true);
    });

    it('defaults role to salesman', () => {
      const input = {
        username: 'salesman1',
        password: 'temppass123',
      };
      const result = createEmployeeSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('salesman');
      }
    });
  });
});

describe('Shop Schemas', () => {
  it('accepts valid shop input', () => {
    const input = {
      name: 'Corner Store',
      phone: '9876543210',
      latitude: 19.076,
      longitude: 72.8777,
    };
    expect(createShopSchema.safeParse(input).success).toBe(true);
  });

  it('rejects latitude out of range', () => {
    const input = {
      name: 'Corner Store',
      phone: '9876543210',
      latitude: 95.0,
      longitude: 72.8777,
    };
    expect(createShopSchema.safeParse(input).success).toBe(false);
  });

  it('rejects missing phone', () => {
    const input = { name: 'Corner Store' };
    expect(createShopSchema.safeParse(input).success).toBe(false);
  });

  it('rejects phone with less than 10 digits', () => {
    const input = {
      name: 'Corner Store',
      phone: '123456789',
    };
    const res = createShopSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it('rejects phone with more than 10 digits', () => {
    const input = {
      name: 'Corner Store',
      phone: '12345678901',
    };
    const res = createShopSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it('rejects phone with non-numeric characters', () => {
    const input = {
      name: 'Corner Store',
      phone: '12345abcde',
    };
    const res = createShopSchema.safeParse(input);
    expect(res.success).toBe(false);
  });
});

describe('Order Schemas', () => {
  it('accepts valid order input', () => {
    const input = {
      shopId: '550e8400-e29b-41d4-a716-446655440000',
      items: [
        { productId: '550e8400-e29b-41d4-a716-446655440001', quantity: 10, unitPrice: 45.50 },
      ],
    };
    expect(createOrderSchema.safeParse(input).success).toBe(true);
  });

  it('rejects empty items array', () => {
    const input = {
      shopId: '550e8400-e29b-41d4-a716-446655440000',
      items: [],
    };
    expect(createOrderSchema.safeParse(input).success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const input = {
      shopId: '550e8400-e29b-41d4-a716-446655440000',
      items: [
        { productId: '550e8400-e29b-41d4-a716-446655440001', quantity: -1, unitPrice: 45.50 },
      ],
    };
    expect(createOrderSchema.safeParse(input).success).toBe(false);
  });
});

describe('Product Schemas', () => {
  it('accepts valid product input', () => {
    const input = { name: 'Dishwasher Soap 500ml', price: 45.50 };
    expect(createProductSchema.safeParse(input).success).toBe(true);
  });

  it('rejects negative price', () => {
    const input = { name: 'Dishwasher Soap', price: -10 };
    expect(createProductSchema.safeParse(input).success).toBe(false);
  });

  it('defaults stockQuantity to 0', () => {
    const input = { name: 'Soap', price: 45.50 };
    const result = createProductSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stockQuantity).toBe(0);
    }
  });
});

describe('Visit Schemas', () => {
  it('accepts valid visit input', () => {
    const input = {
      shopId: '550e8400-e29b-41d4-a716-446655440000',
      latitude: 19.076,
      longitude: 72.8777,
    };
    expect(createVisitSchema.safeParse(input).success).toBe(true);
  });

  it('rejects missing coordinates', () => {
    const input = {
      shopId: '550e8400-e29b-41d4-a716-446655440000',
    };
    expect(createVisitSchema.safeParse(input).success).toBe(false);
  });
});

describe('Payment Schemas', () => {
  it('accepts valid payment input', () => {
    const input = {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      amountPaid: 500.00,
      paymentMethod: 'upi',
    };
    expect(createPaymentSchema.safeParse(input).success).toBe(true);
  });

  it('rejects invalid payment method', () => {
    const input = {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      amountPaid: 500.00,
      paymentMethod: 'crypto',
    };
    expect(createPaymentSchema.safeParse(input).success).toBe(false);
  });

  it('rejects zero amount', () => {
    const input = {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      amountPaid: 0,
      paymentMethod: 'cash',
    };
    expect(createPaymentSchema.safeParse(input).success).toBe(false);
  });
});
