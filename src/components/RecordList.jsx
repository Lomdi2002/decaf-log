import RecordItem from './RecordItem'

function RecordList({ records, onDelete }) {
  return (
    <ul className="record-list">
      {records.map((record) => (
        <RecordItem key={record.id} record={record} onDelete={onDelete} />
      ))}
    </ul>
  )
}

export default RecordList
