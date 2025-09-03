import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import Server from '../server';

describe('Default Controller', () => {
  it('should respond to health check', () =>
    request(Server)
      .get('/api/')
      .expect('Content-Type', /json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property(
          'status',
          'Kiln API Gateway is running.'
        );
      }));

  it('should handle create', () =>
    request(Server)
      .post('/api/')
      .send({ name: 'test' })
      .expect('Content-Type', /json/)
      .expect(201)
      .then((res) => {
        expect(res.body).to.have.property('message', 'Create endpoint hit');
        expect(res.body.data).to.have.property('name', 'test');
      }));

  it('should handle byId', () =>
    request(Server)
      .get('/api/123')
      .expect('Content-Type', /json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('message').that.includes('123');
      }));
});
