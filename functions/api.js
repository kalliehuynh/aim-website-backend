require('dotenv').config
import { Client } from '@notionhq/client'
const express = require('express')
const cors = require('cors')

const serverless = require('serverless-http')

const app = express()
app.use(cors)

const router = express.Router();

const notionSecret = process.env.NOTION_SECRET
const notionDatabaseID = process.env.NOTION_DATABASE_ID

if (!notionDatabaseID || !notionSecret) {
    throw Error('Must define NOTION_SECRET and NOTION_DATABASE_ID in env')
}

const notion = new Client({
    auth: notionSecret,
})

router.get('/', cors(), (req, res) => {
    const query = await notion.databases.query({
        database_id: notionDatabaseID,
    })

    const event = query.results.map((row) => {
        // JSON processing due to bugs
        console.log('row', row)
        const rowProps = JSON.parse(JSON.stringify(row)).properties
        const nameCell = JSON.parse(JSON.stringify(rowProps.Name)).title[0]
        const dateCell = JSON.parse(JSON.stringify(rowProps.Date))
        const locationCell = rowProps.location
        const descCell = rowProps.description

        // Depending on column "type" in Notion, there will be different data available 
        // (URL vs date vs text). So for TypeScript to safely infer, we need to check
        // "type" value.
        const isName = nameCell.type === 'text'
        const isDate = dateCell.type === 'date'
        const isLocation = locationCell.type === 'rich_text'
        const isDesc = descCell.type === 'rich_text'

        if (isName && isDate && isLocation && isDesc) {
            // Pull the string values of the cells off the column data
            const name = nameCell.plain_text
            const date = dateCell.date
            const location = locationCell.rich_text?.[0].plain_text
            const desc = descCell.rich_text?.[0].plain_text
            // Return it in event shape
            return (
                { 
                    'name': name, 
                    'date': date, 
                    'location': location, 
                    'desc': desc 
                }
            )
        }
        return (
            { 
                'name': 'NOT_FOUND', 
                'date': {}, 
                'location': '', 
                'desc': 'desc' 
            }
        )
    })
    res.json(event)
})

app.use('/', router)
module.exports.handler = serverless(app)
