require('dotenv').config();
import http from 'http'
import { Client } from '@notionhq/client'

interface AimEvent {
    name: string;
    date: object;
    location: string;
    desc: string;
}

const notionSecret = process.env.NOTION_SECRET
const notionDatabaseID = process.env.NOTION_DATABASE_ID

if (!notionDatabaseID || !notionSecret) {
    throw Error('Must define NOTION_SECRET and NOTION_DATABASE_ID in env')
}

const notion = new Client({
    auth: notionSecret,
})

const HOST = 'localhost'
const PORT = 3001

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    switch (req.url) {
        case '/':
            const query = await notion.databases.query({
                database_id: notionDatabaseID,
            })
            const list: AimEvent[] = query.results.map((row) => {
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
                    // Return it in our `ThingToLearn` shape
                    return { name, date, location, desc };
                }

                return { name: 'NOT_FOUND', date: {}, location: '', desc: '' }
            })

            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify(list));
            break
        default:
            res.writeHead(404)
            res.end(JSON.stringify({ error: 'Resource not found' }))
    }
})

server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`)
})