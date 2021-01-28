const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const fixtures = require('./bookmarks-fixtures')

describe('Bookmarks Endpoints', function() {
// create the knex instance to connect to the database

let database

before('make knex instance', () => {
    db = knex({
        client: 'pg',
        connection: process.env.TEST_DATABASE_URL,
    })
    app.set('db', db)
})

after('disconnect from db', () => db.destroy)

before('clean the table', () => db('bookmarks_list').truncate())

afterEach('cleanup',() => db('bookmarks_list').truncate())

describe(`GET /api/bookmarks`, () => {
    context(`Given no bookmarks`, () => {
        it('responds with 200 and an empty list', () => {
            return supertest(app)
                .get('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, [])
        })
    })

    context('Given there are bookmarks', () => {
        const testBookmarks = fixtures.makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks_list')
                .insert(testBookmarks)
        })

        it('gets all bookmarks', () => {
            return supertest(app)
                .get('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, testBookmarks)
        })
    })
})
    describe(`POST /api/bookmarks`, () => {
        it(`creates a bookmark, responding with 201 and the new bookmark`, () => {
            const newBookmark = {
                title: 'Google',
                url: 'https://www.google.com',
                description: 'Where we find everything else',
                rating: 4,
            } 
            return supertest(app)
                .post('/api/bookmarks')
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.be.eql(newBookmark.title)
                    expect(res.body.url).to.be.eql(newBookmark.url)
                    expect(res.body.description).to.be.eql(newBookmark.description)
                    expect(res.body.rating).to.be.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(res => 
                    supertest(app)
                    .get(`/api/bookmarks/${res.body.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(res.body)
        )
    })

    it('removes XSS attack content from response', () => {
        const { maliciousBookmark, expectedBookmark } = fixtures.makeMaliciousBookmark()
        return supertest(app)
            .post(`/api/bookmarks`)
            .send(maliciousBookmark)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(201)
            .expect(res => {
                expect(res.body.title).to.eql(expectedBookmark.title)
                expect(res.body.description).to.eql(expectedBookmark.description)
            })
    })
})

    describe('Get /api/bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it(`responds with 404 when bookmark doesn't exist`, () => {
               
                return supertest(app)
                    .get('/api/bookmarks/123')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: `Bookmark not found`}
                    })

            })
        })
    })

    describe.only('DELETE /api/bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it(`responds 404 bookmark does not exist `, () => {
                return supertest(app)
                    .delete(`/api/bookmarks/123`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: `Bookmark not found`}
                    })

            })
        })

        context('Given there are bookmarks', () => {
            const testBookmarks = fixtures.makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks_list')
                    .insert(testBookmarks)
                    
            })

            it('removed the bookmark by ID', () => {
                const idToRemove = 2
                const expectedBookmarks = testBookmarks.filter(bm => bm.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                        .get('/api/bookmarks')
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(expectedBookmarks)
                        )
            })
        })
    })

    describe.only(`PATCH /api/bookmarks/:id`, () => {
        context(`Given no bookmarks`, () => {
            it('responds with 404', () => {
                const bookmarkId = 12345
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: 'Bookmark not found'}
                    })
            })
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = fixtures.makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks_list')
                    .insert(testBookmarks)
            })

            it('responds with 204 and updates the bookmark', () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'updated bookmark title',
                    description: 'updated description'
                }

                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                }

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
    
                    )
            })
        })
    })
})