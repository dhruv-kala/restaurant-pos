import { BadRequestException } from '@nestjs/common';

import { CommunicationTemplateRenderer } from './communication-template-renderer';

describe('CommunicationTemplateRenderer', () => {
  const renderer = new CommunicationTemplateRenderer();

  it('renders declared scalar placeholders in subject and body', () => {
    const prepared = renderer.prepare(
      'Order {{orderNumber}}',
      'Hello {{customerName}}, total {{orderTotal}}',
      [
        { key: 'orderNumber', required: true },
        { key: 'customerName', required: true },
        { key: 'orderTotal', required: true },
      ],
    );

    expect(
      renderer.render(prepared, {
        orderNumber: 'A-42',
        customerName: 'Asha',
        orderTotal: 1250,
      }),
    ).toEqual({
      subject: 'Order A-42',
      body: 'Hello Asha, total 1250',
    });
  });

  it('rejects undeclared and unused variables', () => {
    expect(() => renderer.prepare(null, 'Hello {{customerName}}', [])).toThrow(BadRequestException);
    expect(() =>
      renderer.prepare(null, 'Hello', [{ key: 'customerName', required: true }]),
    ).toThrow(BadRequestException);
  });

  it('rejects missing, unknown, and non-scalar render values', () => {
    const prepared = renderer.prepare(null, 'Hello {{customerName}}', [
      { key: 'customerName', required: true },
    ]);
    expect(() => renderer.render(prepared, {})).toThrow(BadRequestException);
    expect(() => renderer.render(prepared, { customerName: 'Asha', extra: 'value' })).toThrow(
      BadRequestException,
    );
    expect(() => renderer.render(prepared, { customerName: { unsafe: true } })).toThrow(
      BadRequestException,
    );
  });
});
